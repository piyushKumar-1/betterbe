/**
 * Momentum Score Analytics
 * 
 * Calculates trend direction using linear regression on recent completion data.
 * Returns a score from -1 (declining) to +1 (improving).
 */

import { getAllCheckInsForHabit } from '../db/checkins';
import { getHabit } from '../db/habits';
import type { Habit } from '../db/schema';

export type MomentumDirection = 'improving' | 'stable' | 'declining';

export interface MomentumData {
    score: number; // -1 to +1
    direction: MomentumDirection;
    slopePerDay: number;
    dataPoints: number;
}

/**
 * Calculate momentum score for a habit
 */
export async function calculateMomentum(
    habitId: string,
    windowDays: number = 30
): Promise<MomentumData> {
    const habit = await getHabit(habitId);
    if (!habit) {
        return { score: 0, direction: 'stable', slopePerDay: 0, dataPoints: 0 };
    }

    const checkIns = await getAllCheckInsForHabit(habitId);
    const checkInMap = new Map<string, number>();
    checkIns.forEach(c => checkInMap.set(c.effectiveDate, c.value));

    // Build data points for last N days
    const today = new Date();
    const dataPoints: Array<{ x: number; y: number }> = [];

    for (let i = windowDays - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const value = checkInMap.get(dateStr) ?? 0;
        const normalizedValue = normalizeValue(value, habit);

        dataPoints.push({
            x: windowDays - 1 - i, // 0 is oldest, windowDays-1 is today
            y: normalizedValue
        });
    }

    // Calculate linear regression
    const { slope } = linearRegression(dataPoints);

    // Normalize slope to -1 to +1 range
    // Slope of 0.01 means +1% per day = very strong improvement
    const normalizedScore = Math.max(-1, Math.min(1, slope * 50));

    return {
        score: normalizedScore,
        direction: getMomentumDirection(normalizedScore),
        slopePerDay: slope,
        dataPoints: dataPoints.length
    };
}

/**
 * Get direction from score
 */
function getMomentumDirection(score: number): MomentumDirection {
    if (score > 0.1) return 'improving';
    if (score < -0.1) return 'declining';
    return 'stable';
}

/**
 * Normalize value to 0-1 scale
 */
function normalizeValue(value: number, habit: Habit): number {
    if (habit.type === 'binary') {
        return value > 0 ? 1 : 0;
    }

    if (!habit.targetValue || habit.targetValue === 0) {
        return value > 0 ? 1 : 0;
    }

    return Math.min(value / habit.targetValue, 1);
}

/**
 * Simple linear regression
 * Returns slope and intercept of best-fit line
 */
function linearRegression(points: Array<{ x: number; y: number }>): {
    slope: number;
    intercept: number;
} {
    const n = points.length;
    if (n === 0) return { slope: 0, intercept: 0 };

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (const point of points) {
        sumX += point.x;
        sumY += point.y;
        sumXY += point.x * point.y;
        sumXX += point.x * point.x;
    }

    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) return { slope: 0, intercept: sumY / n };

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
}

/**
 * Get momentum arrow character
 */
export function getMomentumArrow(direction: MomentumDirection): string {
    switch (direction) {
        case 'improving':
            return '↗';
        case 'declining':
            return '↘';
        case 'stable':
        default:
            return '→';
    }
}
