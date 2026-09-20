import { createControlledTools, ControlledTools } from "./controlledTools";
import {
    AIProvider,
    StayOnAgentProvider,
    RawAgentModelOutput,
    RawReplanModelOutput,
    RawSuggestedAction,
} from "./aiProvider";
import { AppError } from "../utils/errors";

export interface AgentAction {
    type: string;
    taskId?: string;
    label?: string;
    requiresUserConfirmation?: boolean;
    payload?: Record<string, unknown>;
    tasks?: Array<Record<string, unknown>>;
    planId?: string;
}

export interface AgentResponse {
    reply: string;
    suggestedActions: AgentAction[];
}

export interface ReplanChange {
    taskId: string;
    field: string;
    oldValue: string;
    newValue: string;
    reason: string;
}

export interface ReplanResponse {
    planId: string;
    summary: string;
    changes: ReplanChange[];
    requiresUserConfirmation: true;
}

/**
 * Agent Suggested Action Types (Client-Facing UI Action Descriptors):
 * 1. reschedule_task
 * 2. create_tasks
 * 3. start_task
 * 4. view_today
 * 5. view_pending
 * 6. replan
 *
 * ARCHITECTURE DISTINCTION:
 * These are frontend/UI-facing action descriptors returned to the student in suggestedActions.
 *
 * They are strictly DISTINCT from the 4 server-side Controlled Agent Tools:
 * (get_today_tasks, get_pending_tasks, create_tasks, replan_tasks).
 *
 * SAFETY INVARIANTS:
 * 1. An action type never bypasses the controlled-tools boundary or mutates DynamoDB directly.
 * 2. Any mutating action type (reschedule_task, create_tasks, replan) MUST require
 *    explicit user confirmation before any database mutation can take place.
 * 3. POST /replan strictly generates a proposal and NEVER mutates DynamoDB.
 */
export const AGENT_SUGGESTED_ACTION_TYPES = [
    "reschedule_task",
    "create_tasks",
    "start_task",
    "view_today",
    "view_pending",
    "replan",
] as const;

export type AgentSuggestedActionType = typeof AGENT_SUGGESTED_ACTION_TYPES[number];

export const APPROVED_ACTION_TYPES = new Set<string>(AGENT_SUGGESTED_ACTION_TYPES);

let currentProvider: AIProvider = new StayOnAgentProvider();

export function setAIProvider(provider: AIProvider): void {
    currentProvider = provider;
}

export function getAIProvider(): AIProvider {
    return currentProvider;
}

export function resetAIProvider(): void {
    currentProvider = new StayOnAgentProvider();
}

/**
 * Accurately derives the student's current local date (YYYY-MM-DD) based on IANA timezone.
 * Falls back safely to UTC date if invalid or unspecified.
 */
export function getTodayDateForTimezone(timezone?: string): string {
    if (!timezone || typeof timezone !== "string") {
        return new Date().toISOString().slice(0, 10);
    }
    try {
        const formatter = new Intl.DateTimeFormat("en-CA", {
            timeZone: timezone.trim(),
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
        return formatter.format(new Date());
    } catch {
        return new Date().toISOString().slice(0, 10);
    }
}

/**
 * Handles conversational queries for task coaching.
 * Flow: Backend Validation -> Controlled Tools -> AI Provider -> Backend Validation
 * The agent NEVER accesses DynamoDB directly.
 */
export async function handleAgentMessage(
    userId: string,
    message: string,
    timezone?: string,
): Promise<AgentResponse> {
    if (!message || typeof message !== "string" || message.trim().length === 0) {
        throw new AppError("INVALID_MESSAGE", "Student message is required", 400);
    }

    const todayDate = getTodayDateForTimezone(timezone);
    const tools: ControlledTools = createControlledTools(userId);

    // Call AI provider with controlled tools boundary
    const rawOutput: RawAgentModelOutput = await currentProvider.handleAgentMessage(
        message.trim(),
        tools,
        { userId, timezone, todayDate },
    );

    // Backend validation of AI output
    if (!rawOutput || typeof rawOutput.reply !== "string" || rawOutput.reply.trim().length === 0) {
        throw new AppError("INVALID_AI_OUTPUT", "AI provider returned empty or invalid reply", 502);
    }

    if (!Array.isArray(rawOutput.suggestedActions)) {
        throw new AppError("INVALID_AI_OUTPUT", "AI provider suggestedActions must be an array", 502);
    }

    const validatedActions: AgentAction[] = [];

    for (const action of rawOutput.suggestedActions) {
        if (!action || typeof action.type !== "string") {
            throw new AppError("INVALID_AI_ACTION", "Action must have a valid type string", 502);
        }

        // Reject unsupported action types
        if (!APPROVED_ACTION_TYPES.has(action.type)) {
            throw new AppError(
                "UNSUPPORTED_ACTION_TYPE",
                `Action type '${action.type}' is not supported by the controlled agent protocol`,
                502,
            );
        }

        // Safety Invariant: Any modifying action MUST require explicit user confirmation
        const isModifying = action.type === "reschedule_task" || action.type === "create_tasks" || action.type === "replan";
        const requiresUserConfirmation = isModifying ? true : Boolean(action.requiresUserConfirmation);

        validatedActions.push({
            type: action.type,
            ...(action.taskId ? { taskId: String(action.taskId) } : {}),
            ...(action.label ? { label: String(action.label) } : {}),
            requiresUserConfirmation,
            ...(action.payload ? { payload: action.payload } : {}),
            ...(action.tasks ? { tasks: action.tasks } : {}),
            ...(action.planId ? { planId: String(action.planId) } : {}),
        });
    }

    return {
        reply: rawOutput.reply,
        suggestedActions: validatedActions,
    };
}

/**
 * Generates an adaptive task replanning schedule.
 * Flow: Backend Validation -> Controlled Tools -> AI Provider -> Backend Validation -> Proposal Return
 * Does NOT directly mutate DynamoDB; requires explicit user confirmation.
 */
export async function generateReplan(
    userId: string,
    reason: string,
    horizonDays = 7,
    timezone?: string,
): Promise<ReplanResponse> {
    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
        throw new AppError("INVALID_REASON", "Replan reason is required", 400);
    }

    const validHorizon = Math.max(1, Math.min(typeof horizonDays === "number" ? horizonDays : 7, 30));
    const todayDate = getTodayDateForTimezone(timezone);
    const tools: ControlledTools = createControlledTools(userId);

    // Call AI provider with controlled tools
    const rawOutput: RawReplanModelOutput = await currentProvider.generateReplan(
        {
            reason: reason.trim(),
            horizonDays: validHorizon,
            todayDate,
        },
        tools,
        { userId },
    );

    // Backend validation of Replan output
    if (!rawOutput || typeof rawOutput.planId !== "string" || rawOutput.planId.trim().length === 0) {
        throw new AppError("INVALID_AI_OUTPUT", "AI replan must contain a non-empty planId", 502);
    }

    if (typeof rawOutput.summary !== "string" || rawOutput.summary.trim().length === 0) {
        throw new AppError("INVALID_AI_OUTPUT", "AI replan must contain a non-empty summary", 502);
    }

    if (!Array.isArray(rawOutput.changes)) {
        throw new AppError("INVALID_AI_OUTPUT", "AI replan changes must be an array", 502);
    }

    const validatedChanges: ReplanChange[] = [];
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    for (const change of rawOutput.changes) {
        if (!change.taskId || typeof change.taskId !== "string") {
            throw new AppError("INVALID_AI_OUTPUT", "Each replan change must specify a taskId", 502);
        }
        if (change.field !== "scheduledDate") {
            throw new AppError("INVALID_AI_OUTPUT", "Replan change field must be 'scheduledDate'", 502);
        }
        if (!change.newValue || !dateRegex.test(change.newValue)) {
            throw new AppError("INVALID_AI_OUTPUT", "Replan change newValue must be a valid YYYY-MM-DD date", 502);
        }

        validatedChanges.push({
            taskId: change.taskId,
            field: "scheduledDate",
            oldValue: change.oldValue || todayDate,
            newValue: change.newValue,
            reason: change.reason || reason,
        });
    }

    // Safety Invariant: requiresUserConfirmation is ALWAYS strictly true
    return {
        planId: rawOutput.planId,
        summary: rawOutput.summary,
        changes: validatedChanges,
        requiresUserConfirmation: true,
    };
}
