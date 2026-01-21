/**
 * Reminder Operations - Unified Data Layer
 */

import { getDataLayer } from './index';
import type { HabitReminder } from './types';

/**
 * Get reminder for a habit
 */
export async function getReminderForHabit(habitId: string): Promise<HabitReminder | undefined> {
    const dataLayer = getDataLayer();
    return dataLayer.getReminder(habitId);
}

/**
 * Create or update a reminder
 */
export async function upsertReminder(input: Omit<HabitReminder, 'id' | 'createdAt' | 'updatedAt'>): Promise<HabitReminder> {
    const dataLayer = getDataLayer();
    return dataLayer.upsertReminder(input);
}

/**
 * Delete a reminder
 */
export async function deleteReminder(habitId: string): Promise<void> {
    const dataLayer = getDataLayer();
    await dataLayer.deleteReminder(habitId);
}

