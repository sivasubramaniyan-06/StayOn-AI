import { getTasks, createTask, updateTask } from "./taskService";
import { getGoals } from "./goalService";
import { Task } from "../models/task";

export interface ControlledTask {
    id: string;
    goalId: string;
    goalTitle?: string;
    title: string;
    status: string;
    scheduledDate?: string;
    dueDate?: string;
    estimatedMinutes?: number;
    priority?: string;
    parentId?: string | null;
}

export interface ControlledReplanChange {
    taskId: string;
    field: string;
    oldValue: string;
    newValue: string;
    reason?: string;
}

export interface ControlledReplanData {
    planId: string;
    summary: string;
    changes: ControlledReplanChange[];
    requiresUserConfirmation: true;
}

export interface ControlledTools {
    get_today_tasks(date?: string): Promise<ControlledTask[]>;
    get_pending_tasks(goalId?: string): Promise<ControlledTask[]>;
    create_tasks(
        tasks: Partial<ControlledTask>[],
        confirmed?: boolean,
    ): Promise<{
        status: "created" | "requires_user_confirmation";
        tasks: Partial<ControlledTask>[];
    }>;
    replan_tasks(
        replanData: ControlledReplanData,
        confirmed?: boolean,
    ): Promise<{
        status: "applied" | "requires_user_confirmation";
        updatedCount?: number;
        plan?: ControlledReplanData;
    }>;
}

/**
 * Controlled Agent Tools (Server-Side Execution Boundary):
 * 1. get_today_tasks
 * 2. get_pending_tasks
 * 3. create_tasks
 * 4. replan_tasks
 *
 * ARCHITECTURE DISTINCTION:
 * These 4 tools define the server-side boundary through which the AI reasoning layer
 * accesses and proposes task operations.
 *
 * They are strictly DISTINCT from the client-facing Agent Suggested Action Types
 * (reschedule_task, create_tasks, start_task, view_today, view_pending, replan).
 *
 * SAFETY INVARIANTS:
 * 1. The AI reasoning layer NEVER directly accesses DynamoDB or S3.
 * 2. Suggested action types returned to the client NEVER bypass this boundary.
 * 3. Modifying operations (create_tasks, replan_tasks) strictly require confirmed === true
 *    before any DynamoDB mutation can occur.
 */
export const CONTROLLED_AGENT_TOOLS = [
    "get_today_tasks",
    "get_pending_tasks",
    "create_tasks",
    "replan_tasks",
] as const;

export type ControlledAgentToolName = typeof CONTROLLED_AGENT_TOOLS[number];

/**
 * Creates the controlled tools boundary for a specific authenticated user.
 * The AI agent MUST interact with task data exclusively through this boundary.
 * Direct database access by the AI is strictly prohibited.
 */
export function createControlledTools(userId: string): ControlledTools {
    return {
        async get_today_tasks(date?: string): Promise<ControlledTask[]> {
            const targetDate = date || new Date().toISOString().slice(0, 10);
            const [tasks, goals] = await Promise.all([
                getTasks(userId),
                getGoals(userId),
            ]);

            const goalMap = new Map(goals.map((g) => [g.goalId, g.title]));

            return tasks
                .filter((t) => {
                    const sched = t.scheduledDate ? t.scheduledDate.slice(0, 10) : undefined;
                    const due = t.dueDate ? t.dueDate.slice(0, 10) : undefined;
                    return (sched === targetDate || due === targetDate) && t.status !== "completed";
                })
                .map((t) => ({
                    id: t.id || t.taskId,
                    goalId: t.goalId,
                    goalTitle: goalMap.get(t.goalId) || "",
                    title: t.title,
                    status: t.status,
                    scheduledDate: t.scheduledDate || (t.dueDate ? t.dueDate.slice(0, 10) : targetDate),
                    dueDate: t.dueDate,
                    estimatedMinutes: t.estimatedMinutes ?? 30,
                    priority: t.priority,
                    parentId: t.parentId,
                }));
        },

        async get_pending_tasks(goalId?: string): Promise<ControlledTask[]> {
            const [tasks, goals] = await Promise.all([
                getTasks(userId, goalId ? { goalId } : undefined),
                getGoals(userId),
            ]);

            const goalMap = new Map(goals.map((g) => [g.goalId, g.title]));

            return tasks
                .filter((t) => t.status !== "completed")
                .map((t) => ({
                    id: t.id || t.taskId,
                    goalId: t.goalId,
                    goalTitle: goalMap.get(t.goalId) || "",
                    title: t.title,
                    status: t.status,
                    scheduledDate: t.scheduledDate,
                    dueDate: t.dueDate,
                    estimatedMinutes: t.estimatedMinutes ?? 30,
                    priority: t.priority,
                    parentId: t.parentId,
                }));
        },

        async create_tasks(
            tasks: Partial<ControlledTask>[],
            confirmed = false,
        ): Promise<{
            status: "created" | "requires_user_confirmation";
            tasks: Partial<ControlledTask>[];
        }> {
            if (!confirmed) {
                // Safety invariant: AI suggests, backend validates, user confirms.
                // Do not mutate DynamoDB without user confirmation.
                return {
                    status: "requires_user_confirmation",
                    tasks,
                };
            }

            const now = new Date().toISOString();
            const created: ControlledTask[] = [];

            for (const t of tasks) {
                if (!t.title || !t.goalId) continue;
                const taskId = crypto.randomUUID();
                const item: Task = {
                    taskId,
                    id: taskId,
                    userId,
                    goalId: t.goalId,
                    title: t.title.trim(),
                    status: "pending",
                    scheduledDate: t.scheduledDate,
                    dueDate: t.dueDate || t.scheduledDate,
                    estimatedMinutes: t.estimatedMinutes ?? 30,
                    priority: (t.priority === "low" || t.priority === "high" ? t.priority : "medium") as "low" | "medium" | "high",
                    parentId: t.parentId ?? null,
                    createdAt: now,
                    updatedAt: now,
                };
                const res = await createTask(item);
                created.push({
                    id: res.id || res.taskId,
                    goalId: res.goalId,
                    title: res.title,
                    status: res.status,
                    scheduledDate: res.scheduledDate,
                    dueDate: res.dueDate,
                    estimatedMinutes: res.estimatedMinutes,
                    priority: res.priority,
                    parentId: res.parentId,
                });
            }

            return {
                status: "created",
                tasks: created,
            };
        },

        async replan_tasks(
            replanData: ControlledReplanData,
            confirmed = false,
        ): Promise<{
            status: "applied" | "requires_user_confirmation";
            updatedCount?: number;
            plan?: ControlledReplanData;
        }> {
            if (!confirmed) {
                // Safety invariant: proposals do NOT mutate database
                return {
                    status: "requires_user_confirmation",
                    plan: replanData,
                };
            }

            let updatedCount = 0;
            for (const change of replanData.changes) {
                if (change.field === "scheduledDate" && change.newValue) {
                    await updateTask(userId, change.taskId, {
                        scheduledDate: change.newValue,
                        dueDate: change.newValue,
                    });
                    updatedCount++;
                }
            }

            return {
                status: "applied",
                updatedCount,
                plan: replanData,
            };
        },
    };
}
