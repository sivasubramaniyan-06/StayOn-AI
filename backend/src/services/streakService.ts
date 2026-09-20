import { getHabitLogs } from "./habitLogService";
import { HabitLog } from "../models/habitLog";

export interface StreakData {
    habitId: string;
    currentStreak: number;
    longestStreak: number;
    completedDates: string[];
}

export async function calculateHabitStreak(
    userId: string,
    habitId: string,
): Promise<StreakData> {
    const logs = await getHabitLogs(userId);

    const habitLogs = logs
        .filter(
            (log: HabitLog) =>
                log.habitId === habitId && log.completed,
        )
        .sort((a, b) => a.date.localeCompare(b.date));

    const completedDates = habitLogs.map((log) => log.date);

    if (completedDates.length === 0) {
        return {
            habitId,
            currentStreak: 0,
            longestStreak: 0,
            completedDates: [],
        };
    }

    let longestStreak = 1;
    let runningStreak = 1;

    for (let i = 1; i < completedDates.length; i++) {
        const previous = new Date(
            `${completedDates[i - 1]}T00:00:00Z`,
        );

        const current = new Date(
            `${completedDates[i]}T00:00:00Z`,
        );

        const difference =
            (current.getTime() - previous.getTime()) /
            (1000 * 60 * 60 * 24);

        if (difference === 1) {
            runningStreak++;
            longestStreak = Math.max(
                longestStreak,
                runningStreak,
            );
        } else {
            runningStreak = 1;
        }
    }

    const today = new Date();
    const todayString = today.toISOString().slice(0, 10);

    let currentStreak = 0;

    if (
        completedDates[completedDates.length - 1] ===
        todayString
    ) {
        currentStreak = 1;

        for (let i = completedDates.length - 1; i > 0; i--) {
            const current = new Date(
                `${completedDates[i]}T00:00:00Z`,
            );

            const previous = new Date(
                `${completedDates[i - 1]}T00:00:00Z`,
            );

            const difference =
                (current.getTime() - previous.getTime()) /
                (1000 * 60 * 60 * 24);

            if (difference === 1) {
                currentStreak++;
            } else {
                break;
            }
        }
    }

    return {
        habitId,
        currentStreak,
        longestStreak,
        completedDates,
    };
}