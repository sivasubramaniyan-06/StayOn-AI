export interface Task {
    taskId: string;
    id?: string;
    goalId: string;
    goalTitle?: string;
    userId: string;

    title: string;
    description?: string;
    parentId?: string | null;

    status: "pending" | "in_progress" | "completed";
    priority?: "low" | "medium" | "high";

    scheduledDate?: string;
    dueDate?: string;
    estimatedMinutes?: number;

    createdAt: string;
    updatedAt: string;
}