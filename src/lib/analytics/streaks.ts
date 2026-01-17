/**
 * Streak Analytics
 * 
 * Derives streak information from check-in data.
 * Streaks are NEVER stored - always calculated on demand.
 */

import { getAllCheckInsForHabit } from '../db/checkins';
import { getHabit } from '../db/habits';
import type { Habit } from '../db/schema';

export interface StreakData {
    currentStreak: number;
    longestStreak: number;
    lastCompletedDate: string | null;
    isActiveToday: boolean;
}

/**
 * Calculate streak data for a habit
 */
export async function calculateStreaks(habitId: string): Promise<StreakData> {
    const habit = await getHabit(habitId);
    if (!habit) {
        return { currentStreak: 0, longestStreak: 0, lastCompletedDate: null, isActiveToday: false };
    }

    const checkIns = await getAllCheckInsForHabit(habitId);

    // Build set of completed dates
    const completedDates = new Set<string>();
    checkIns.forEach(c => {
        if (isCompleted(habit, c.value)) {
            completedDates.add(c.effectiveDate);
        }
    });

    if (completedDates.size === 0) {
        return { currentStreak: 0, longestStreak: 0, lastCompletedDate: null, isActiveToday: false };
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const isActiveToday = completedDates.has(todayStr);

    // Calculate current streak (counting back from today or yesterday)
    let currentStreak = 0;
    let checkDate = new Date(today);

    // If not active today, start from yesterday
    if (!isActiveToday) {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    while (completedDates.has(checkDate.toISOString().split('T')[0])) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
    }

    // Calculate longest streak
    const sortedDates = Array.from(completedDates).sort();
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1]);
        const curr = new Date(sortedDates[i]);
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            tempStreak++;
        } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
        }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Find last completed date
    const lastCompletedDate = sortedDates[sortedDates.length - 1];

    return {
        currentStreak,
        longestStreak,
        lastCompletedDate,
        isActiveToday
    };
}

/**
 * Check if a value meets the habit's target criteria
 */
function isCompleted(habit: Habit, value: number): boolean {
    if (value === 0) return false;
    if (!habit.targetValue) return value > 0;

    switch (habit.targetDirection) {
        case 'at_least':
            return value >= habit.targetValue;
        case 'at_most':
            return value <= habit.targetValue;
        case 'exactly':
            return value === habit.targetValue;
        default:
            return value >= habit.targetValue;
    }
}
