/**
 * Check-in Operations - Unified Data Layer
 */

import { getDataLayer } from './index';
import type { CheckIn } from './types';

export interface CreateCheckInInput {
    habitId: string;
    value: number;
    effectiveDate?: Date;
    note?: string;
}

/**
 * Create a new check-in
 */
export async function createCheckIn(input: CreateCheckInInput): Promise<CheckIn> {
    const dataLayer = getDataLayer();
    const effectiveDate = input.effectiveDate ?? new Date();
    
    return dataLayer.createCheckIn({
        habitId: input.habitId,
        value: input.value,
        effectiveDate: effectiveDate.toISOString().split('T')[0],
        note: input.note,
    });
}

/**
 * Get check-ins for a specific date
 */
export async function getCheckInsForDate(date: Date): Promise<CheckIn[]> {
    const dataLayer = getDataLayer();
    return dataLayer.getCheckInsForDate(date);
}

/**
 * Get all check-ins for a habit
 */
export async function getCheckInsForHabit(habitId: string): Promise<CheckIn[]> {
    const dataLayer = getDataLayer();
    return dataLayer.getCheckInsForHabit(habitId);
}

/**
 * Update a check-in
 */
export async function updateCheckIn(id: string, updates: Partial<CheckIn>): Promise<void> {
    const dataLayer = getDataLayer();
    await dataLayer.updateCheckIn(id, updates);
}

/**
 * Delete a check-in
 */
export async function deleteCheckIn(id: string): Promise<void> {
    const dataLayer = getDataLayer();
    await dataLayer.deleteCheckIn(id);
}

/**
 * Toggle binary check-in for a specific date
 */
export async function toggleBinaryCheckIn(habitId: string, date: Date): Promise<boolean> {
    const dataLayer = getDataLayer();
    const checkIns = await dataLayer.getCheckInsForDate(date);
    const existing = checkIns.find(c => c.habitId === habitId);
    
    if (existing) {
        await dataLayer.deleteCheckIn(existing.id);
        return false; // Was checked, now unchecked
    } else {
        await dataLayer.createCheckIn({
            habitId,
            value: 1,
            effectiveDate: date.toISOString().split('T')[0],
        });
        return true; // Was unchecked, now checked
    }
}

/**
 * Get all check-ins (for analytics)
 */
export async function getAllCheckIns(): Promise<CheckIn[]> {
    const dataLayer = getDataLayer();
    // Get all habits first, then get check-ins for each
    const habits = await dataLayer.getActiveHabits();
    const allCheckIns: CheckIn[] = [];
    
    for (const habit of habits) {
        const checkIns = await dataLayer.getCheckInsForHabit(habit.id);
        allCheckIns.push(...checkIns);
    }
    
    return allCheckIns;
}

/**
 * Get all check-ins for a specific habit (alias for getCheckInsForHabit)
 */
export async function getAllCheckInsForHabit(habitId: string): Promise<CheckIn[]> {
    return getCheckInsForHabit(habitId);
}

