/**
 * Rolling Average Analytics
 * 
 * Calculates 7, 14, and 30-day rolling averages for habit completion.
 * Filters daily noise to show true momentum.
 */

import { getAllCheckInsForHabit } from '../db/checkins';
import { getHabit } from '../db/habits';
import type { Habit } from '../db/schema';

export interface RollingAveragePoint {
    date: string;
    avg7: number;
    avg14: number;
    avg30: number;
    value: number;
}

export interface RollingAverageData {
    points: RollingAveragePoint[];
    current7: number;
    current14: number;
    current30: number;
}

/**
 * Calculate rolling averages for a habit
 */
export async function calculateRollingAverages(
    habitId: string,
    days: number = 90
): Promise<RollingAverageData> {
    const habit = await getHabit(habitId);
    if (!habit) {
        return { points: [], current7: 0, current14: 0, current30: 0 };
    }

    const checkIns = await getAllCheckInsForHabit(habitId);
    const checkInMap = new Map<string, number>();
    checkIns.forEach(c => checkInMap.set(c.effectiveDate, c.value));

    const today = new Date();
    const points: RollingAveragePoint[] = [];

    // Build date array
    const dates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
    }

    // Calculate rolling averages
    for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        const value = checkInMap.get(date) ?? 0;

        // Get values for windows
        const values7 = getWindowValues(dates, checkInMap, i, 7, habit);
        const values14 = getWindowValues(dates, checkInMap, i, 14, habit);
        const values30 = getWindowValues(dates, checkInMap, i, 30, habit);

        points.push({
            date,
            value: normalizeValue(value, habit),
            avg7: average(values7),
            avg14: average(values14),
            avg30: average(values30)
        });
    }

    // Current averages (last point)
    const lastPoint = points[points.length - 1];

    return {
        points,
        current7: lastPoint?.avg7 ?? 0,
        current14: lastPoint?.avg14 ?? 0,
        current30: lastPoint?.avg30 ?? 0
    };
}

/**
 * Get normalized values for a rolling window
 */
function getWindowValues(
    dates: string[],
    checkInMap: Map<string, number>,
    endIndex: number,
    windowSize: number,
    habit: Habit
): number[] {
    const values: number[] = [];
    const startIndex = Math.max(0, endIndex - windowSize + 1);

    for (let i = startIndex; i <= endIndex; i++) {
        const value = checkInMap.get(dates[i]) ?? 0;
        values.push(normalizeValue(value, habit));
    }

    return values;
}

/**
 * Normalize value to 0-1 scale based on habit type
 */
function normalizeValue(value: number, habit: Habit): number {
    if (habit.type === 'binary') {
        return value > 0 ? 1 : 0;
    }

    if (!habit.targetValue || habit.targetValue === 0) {
        return value > 0 ? 1 : 0;
    }

    // For numeric, cap at 1 (100% of target)
    return Math.min(value / habit.targetValue, 1);
}

/**
 * Calculate average of array
 */
function average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
}
