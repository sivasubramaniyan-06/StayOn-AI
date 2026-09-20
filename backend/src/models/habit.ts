export interface Habit {
    habitId: string;
    id?: string;
    userId: string;
    title: string;
    name?: string;
    frequency: "daily" | "weekly";
    targetMinutes?: number;
    targetCount?: number;
    streak?: number;
    currentStreak: number;
    longestStreak: number;
    completedToday?: boolean;
    lastCompletedDate?: string;
    createdAt: string;
    updatedAt: string;
}