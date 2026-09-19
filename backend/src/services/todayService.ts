import { getTasks } from "./taskService";
import { Task } from "../models/task";

export interface TodayData {
    date: string;
    tasks: Task[];
    completedCount: number;
    pendingCount: number;
}

export async function getToday(
    userId: string,
): Promise<TodayData> {
    const tasks = await getTasks(userId);

    const today = new Date().toISOString().slice(0, 10);

    const todayTasks = tasks.filter((task) => {
        if (!task.dueDate) {
            return false;
        }

        return task.dueDate.slice(0, 10) === today;
    });

    const completedCount = todayTasks.filter(
        (task) => task.status === "completed",
    ).length;

    const pendingCount = todayTasks.filter(
        (task) => task.status !== "completed",
    ).length;

    return {
        date: today,
        tasks: todayTasks,
        completedCount,
        pendingCount,
    };
}