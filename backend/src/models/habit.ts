export interface Habit {
    habitId: string;
    userId: string;
    name: string;
    frequency: "daily" | "weekly";
    targetCount?: number;
    currentStreak: number;
    longestStreak: number;
    createdAt: string;
    updatedAt: string;
}