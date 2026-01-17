/**
 * Calendar Heatmap Analytics
 * 
 * Generates data for GitHub-style calendar heatmaps showing habit completion intensity.
 */

import { getAllCheckInsForHabit } from '../db/checkins';
import { getHabit } from '../db/habits';
import type { CheckIn, Habit } from '../db/schema';

export interface HeatmapCell {
    date: string; // YYYY-MM-DD
    value: number;
    intensity: number; // 0-4 scale for color intensity
    completed: boolean;
}

export interface HeatmapData {
    cells: HeatmapCell[];
    totalDays: number;
    completedDays: number;
    completionRate: number;
}

/**
 * Generate heatmap data for a habit over the last N days
 */
export async function generateHeatmapData(
    habitId: string,
    days: number = 365
): Promise<HeatmapData> {
    const habit = await getHabit(habitId);
    if (!habit) {
        return { cells: [], totalDays: 0, completedDays: 0, completionRate: 0 };
    }

    const checkIns = await getAllCheckInsForHabit(habitId);
    const checkInMap = new Map<string, CheckIn>();
    checkIns.forEach(c => checkInMap.set(c.effectiveDate, c));

    const cells: HeatmapCell[] = [];
    const today = new Date();
    let completedDays = 0;

    // Find max value for intensity normalization
    const values = checkIns.map(c => c.value);
    const maxValue = values.length > 0 ? Math.max(...values) : 1;
    const targetValue = habit.targetValue ?? maxValue;

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const checkIn = checkInMap.get(dateStr);
        const value = checkIn?.value ?? 0;
        const completed = isCompleted(habit, value);

        if (completed) completedDays++;

        cells.push({
            date: dateStr,
            value,
            intensity: calculateIntensity(value, targetValue, habit.type),
            completed
        });
    }

    return {
        cells,
        totalDays: days,
        completedDays,
        completionRate: days > 0 ? completedDays / days : 0
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

/**
 * Calculate intensity (0-4) for heatmap coloring
 */
function calculateIntensity(value: number, target: number, type: string): number {
    if (value === 0) return 0;

    // Binary habits are either 0 or 4
    if (type === 'binary') return value > 0 ? 4 : 0;

    // For numeric habits, scale based on target
    const ratio = value / target;

    if (ratio >= 1) return 4;
    if (ratio >= 0.75) return 3;
    if (ratio >= 0.5) return 2;
    if (ratio > 0) return 1;
    return 0;
}
