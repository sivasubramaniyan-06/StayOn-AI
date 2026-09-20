import { getTasks } from "./taskService";
import { getGoals } from "./goalService";
import { getHabits } from "./habitService";
import { getHabitLogs } from "./habitLogService";
import { Task } from "../models/task";

export interface TodayTaskDTO {
    id: string;
    goalId: string;
    goalTitle: string;
    title: string;
    status: string;
    scheduledDate: string;
    estimatedMinutes: number;
}

export interface TodayHabitDTO {
    id: string;
    title: string;
    streak: number;
    completedToday: boolean;
}

export interface TodayProgressSummary {
    completedCount: number;
    totalCount: number;
    completionRate: number;
}

export interface TodayData {
    date: string;
    tasks: TodayTaskDTO[];
    habits: TodayHabitDTO[];
    progressSummary: TodayProgressSummary;
}

export async function getToday(userId: string): Promise<TodayData> {
    const today = new Date().toISOString().slice(0, 10);

    const [tasks, goals, habits, habitLogs] = await Promise.all([
        getTasks(userId),
        getGoals(userId),
        getHabits(userId),
        getHabitLogs(userId),
    ]);

    const goalMap = new Map(goals.map((g) => [g.goalId, g.title]));

    const todayTasks: TodayTaskDTO[] = tasks
        .filter((task) => {
            const sched = task.scheduledDate ? task.scheduledDate.slice(0, 10) : undefined;
            const due = task.dueDate ? task.dueDate.slice(0, 10) : undefined;
            return sched === today || due === today;
        })
        .map((task) => ({
            id: task.id || task.taskId,
            goalId: task.goalId,
            goalTitle: goalMap.get(task.goalId) || "",
            title: task.title,
            status: task.status,
            scheduledDate: task.scheduledDate || (task.dueDate ? task.dueDate.slice(0, 10) : today),
            estimatedMinutes: task.estimatedMinutes ?? 0,
        }));

    const todayHabitLogs = new Set(
        habitLogs.filter((l) => l.date === today && l.completed).map((l) => l.habitId),
    );

    const todayHabits: TodayHabitDTO[] = habits.map((h) => ({
        id: h.id || h.habitId,
        title: h.title || h.name || "",
        streak: h.streak ?? h.currentStreak ?? 0,
        completedToday: todayHabitLogs.has(h.habitId) || Boolean(h.completedToday),
    }));

    const completedCount = todayTasks.filter((task) => task.status === "completed").length;
    const totalCount = todayTasks.length;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) / 100 : 0;

    return {
        date: today,
        tasks: todayTasks,
        habits: todayHabits,
        progressSummary: {
            completedCount,
            totalCount,
            completionRate,
        },
    };
}