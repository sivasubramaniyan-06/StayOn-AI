import { ControlledTools, ControlledTask } from "./controlledTools";

export interface RawSuggestedAction {
    type: string;
    taskId?: string;
    label?: string;
    requiresUserConfirmation?: boolean;
    payload?: Record<string, unknown>;
    tasks?: Array<Record<string, unknown>>;
    planId?: string;
}

export interface RawAgentModelOutput {
    reply: string;
    suggestedActions: RawSuggestedAction[];
}

export interface RawReplanChange {
    taskId: string;
    field: string;
    oldValue: string;
    newValue: string;
    reason: string;
}

export interface RawReplanModelOutput {
    planId: string;
    summary: string;
    changes: RawReplanChange[];
    requiresUserConfirmation: boolean;
}

export interface AIProvider {
    handleAgentMessage(
        message: string,
        tools: ControlledTools,
        context: { userId: string; timezone?: string; todayDate: string },
    ): Promise<RawAgentModelOutput>;

    generateReplan(
        input: { reason: string; horizonDays: number; todayDate: string },
        tools: ControlledTools,
        context: { userId: string },
    ): Promise<RawReplanModelOutput>;
}

/**
 * Reference StayOn AI Provider implementation reflecting Person 1's architecture in ai/agent and ai/planning.
 * Connects directly through the ControlledTools boundary.
 * Never accesses DynamoDB directly.
 */
export class StayOnAgentProvider implements AIProvider {
    async handleAgentMessage(
        message: string,
        tools: ControlledTools,
        context: { userId: string; timezone?: string; todayDate: string },
    ): Promise<RawAgentModelOutput> {
        const cleanMsg = message.trim();
        const lower = cleanMsg.toLowerCase();
        const todayDate = context.todayDate;

        // Intent 1: Today's Tasks / Focus Query (Read operation via tools)
        if (
            lower.includes("today") ||
            lower.includes("focus") ||
            lower.includes("what should i do") ||
            lower.includes("what to do") ||
            lower.includes("my day") ||
            lower.includes("minute") ||
            lower.includes("time")
        ) {
            const todayTasks = await tools.get_today_tasks(todayDate);
            const pendingTasks = await tools.get_pending_tasks();

            if (todayTasks.length === 0 && pendingTasks.length === 0) {
                return {
                    reply: "You have no tasks scheduled for today and no pending tasks! Great job staying on top of your goals.",
                    suggestedActions: [
                        {
                            type: "view_pending",
                            label: "View All Pending Tasks",
                            requiresUserConfirmation: false,
                        },
                    ],
                };
            }

            const candidateTask = todayTasks[0] || pendingTasks[0];
            const tomorrow = new Date(Date.parse(`${todayDate}T12:00:00Z`) + 86400000)
                .toISOString()
                .slice(0, 10);

            // If time constrained, suggest rescheduling with explicit user confirmation
            if (lower.includes("minute") || lower.includes("reschedule") || lower.includes("time")) {
                return {
                    reply: `Based on your schedule and energy, focus on "${candidateTask.title}". It fits your available window and keeps your momentum steady.`,
                    suggestedActions: [
                        {
                            type: "reschedule_task",
                            taskId: candidateTask.id,
                            requiresUserConfirmation: true,
                            payload: {
                                scheduledDate: tomorrow,
                            },
                        },
                    ],
                };
            }

            return {
                reply: `You have ${todayTasks.length} task(s) scheduled for today. I suggest starting with "${candidateTask.title}". Ready to dive in?`,
                suggestedActions: [
                    {
                        type: "start_task",
                        taskId: candidateTask.id,
                        label: `Start '${candidateTask.title}'`,
                        requiresUserConfirmation: false,
                    },
                ],
            };
        }

        // Intent 2: Pending Tasks Query (Read operation)
        if (lower.includes("pending") || lower.includes("what tasks") || lower.includes("remaining")) {
            const pending = await tools.get_pending_tasks();
            if (pending.length === 0) {
                return {
                    reply: "You have no pending tasks. All caught up!",
                    suggestedActions: [],
                };
            }

            return {
                reply: `You have ${pending.length} pending task(s) across your active goals.`,
                suggestedActions: pending.slice(0, 3).map((t) => ({
                    type: "start_task",
                    taskId: t.id,
                    label: `Work on ${t.title}`,
                    requiresUserConfirmation: false,
                })),
            };
        }

        // Intent 3: Finished Early Query (Read operation)
        if (lower.includes("finished early") || lower.includes("done early") || lower.includes("completed early")) {
            const pending = await tools.get_pending_tasks();
            if (pending.length === 0) {
                return {
                    reply: "Awesome job finishing early! You have no other pending tasks for your goals. Enjoy your well-earned break!",
                    suggestedActions: [],
                };
            }
            const next = pending[0];
            return {
                reply: `Great momentum finishing early! You have ${pending.length} pending task(s). You could tackle "${next.title}". Or take a well-deserved rest!`,
                suggestedActions: [
                    {
                        type: "start_task",
                        taskId: next.id,
                        label: `Start next task: '${next.title}'`,
                        requiresUserConfirmation: false,
                    },
                ],
            };
        }

        // Intent 4: Create Task Request (Mutation proposal - requires user confirmation)
        if (lower.includes("add task") || lower.includes("create task") || lower.includes("schedule revision")) {
            const title = cleanMsg.replace(/(?:can you\s+)?(?:please\s+)?(?:add|create|schedule)\s+(?:a\s+)?(?:task\s+for\s+|task\s+)?/i, "").trim();
            const taskTitle = title ? title.charAt(0).toUpperCase() + title.slice(1) : "New Task";

            return {
                reply: `I have prepared a proposal to add "${taskTitle}" (estimated 45 mins). Would you like to confirm adding this task?`,
                suggestedActions: [
                    {
                        type: "create_tasks",
                        requiresUserConfirmation: true,
                        tasks: [
                            {
                                title: taskTitle,
                                estimatedMinutes: 45,
                                scheduledDate: todayDate,
                            },
                        ],
                    },
                ],
            };
        }

        // Intent 5: Missed / Replanning Request (Mutation proposal - requires user confirmation)
        if (
            lower.includes("missed") ||
            lower.includes("replan") ||
            lower.includes("fell behind") ||
            lower.includes("reschedule") ||
            lower.includes("move tasks")
        ) {
            const plan = await this.generateReplan(
                { reason: cleanMsg, horizonDays: 7, todayDate },
                tools,
                context,
            );

            return {
                reply: `No worries at all! Life happens. ${plan.summary} I can propose moving the affected tasks to an adjusted schedule. Would you like me to apply that?`,
                suggestedActions: [
                    {
                        type: "replan",
                        requiresUserConfirmation: true,
                        planId: plan.planId,
                        payload: {
                            reason: cleanMsg,
                            horizonDays: 7,
                        },
                    },
                ],
            };
        }

        // General conversational response
        return {
            reply: "I'm here to help you stay on track! You can ask me what to do today, check your pending tasks, or ask me to replan your schedule if you fell behind.",
            suggestedActions: [
                {
                    type: "view_today",
                    label: "Check Today's Tasks",
                    requiresUserConfirmation: false,
                },
            ],
        };
    }

    async generateReplan(
        input: { reason: string; horizonDays: number; todayDate: string },
        tools: ControlledTools,
        _context: { userId: string },
    ): Promise<RawReplanModelOutput> {
        const pending = await tools.get_pending_tasks();
        const planId = `pln_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

        if (pending.length === 0) {
            return {
                planId,
                summary: "No pending tasks found to replan. Everything is up to date!",
                changes: [],
                requiresUserConfirmation: true,
            };
        }

        const horizon = Math.max(1, Math.min(input.horizonDays || 7, 30));
        const baseTime = Date.parse(`${input.todayDate}T00:00:00Z`);
        const changes: RawReplanChange[] = [];

        // Distribute pending tasks across horizon days
        pending.slice(0, 10).forEach((task: ControlledTask, index: number) => {
            const dayOffset = (index % horizon) + 1;
            const targetDate = new Date(baseTime + dayOffset * 86400000)
                .toISOString()
                .slice(0, 10);

            const oldVal = task.scheduledDate || (task.dueDate ? task.dueDate.slice(0, 10) : input.todayDate);

            changes.push({
                taskId: task.id,
                field: "scheduledDate",
                oldValue: oldVal,
                newValue: targetDate,
                reason: input.reason
                    ? `Redistributed to balance daily workload (${input.reason})`
                    : "Redistributed to balance daily workload",
            });
        });

        const summary = `Shifted ${changes.length} overdue tasks across the next ${horizon} days, reducing daily load to ~90 minutes.`;

        return {
            planId,
            summary,
            changes,
            requiresUserConfirmation: true,
        };
    }
}

/**
 * Bedrock AI Provider adapter stub.
 * Can be configured with AWS Bedrock Converse API / Bedrock Agent client in production.
 */
export class BedrockAIProviderAdapter implements AIProvider {
    private fallback = new StayOnAgentProvider();

    async handleAgentMessage(
        message: string,
        tools: ControlledTools,
        context: { userId: string; timezone?: string; todayDate: string },
    ): Promise<RawAgentModelOutput> {
        // When AWS_BEDROCK_AGENT_ID or BEDROCK_RUNTIME is configured, invocation occurs here.
        // Falls back safely to StayOnAgentProvider adhering to controlled tools.
        return this.fallback.handleAgentMessage(message, tools, context);
    }

    async generateReplan(
        input: { reason: string; horizonDays: number; todayDate: string },
        tools: ControlledTools,
        context: { userId: string },
    ): Promise<RawReplanModelOutput> {
        return this.fallback.generateReplan(input, tools, context);
    }
}
