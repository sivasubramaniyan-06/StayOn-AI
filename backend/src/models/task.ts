export interface Task {
    taskId: string;
    goalId: string;
    userId: string;

    title: string;
    description?: string;

    status: "pending" | "in_progress" | "completed";
    priority: "low" | "medium" | "high";

    dueDate?: string;

    createdAt: string;
    updatedAt: string;
}