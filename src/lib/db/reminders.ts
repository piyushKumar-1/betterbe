/**
 * Habit Reminder CRUD Operations
 */

import { db, generateId, type HabitReminder, type ReminderType } from './schema';

export interface CreateReminderInput {
    habitId: string;
    type: ReminderType;
    intervalHours?: number;
    dailyTime?: string;
    randomWindowStart?: string;
    randomWindowEnd?: string;
}

/**
 * Create or update a reminder for a habit
 */
export async function upsertReminder(input: CreateReminderInput): Promise<HabitReminder> {
    const existing = await getReminderForHabit(input.habitId);
    const now = new Date();

    if (existing) {
        // Update existing
        await db.habitReminders.update(existing.id, {
            type: input.type,
            enabled: true,
            intervalHours: input.intervalHours,
            dailyTime: input.dailyTime,
            randomWindowStart: input.randomWindowStart,
            randomWindowEnd: input.randomWindowEnd,
            updatedAt: now
        });
        return { ...existing, ...input, enabled: true, updatedAt: now };
    }

    // Create new
    const reminder: HabitReminder = {
        id: generateId(),
        habitId: input.habitId,
        enabled: true,
        type: input.type,
        intervalHours: input.intervalHours,
        dailyTime: input.dailyTime,
        randomWindowStart: input.randomWindowStart,
        randomWindowEnd: input.randomWindowEnd,
        createdAt: now,
        updatedAt: now
    };

    await db.habitReminders.add(reminder);
    return reminder;
}

/**
 * Get reminder for a specific habit
 */
export async function getReminderForHabit(habitId: string): Promise<HabitReminder | undefined> {
    return db.habitReminders.where('habitId').equals(habitId).first();
}

/**
 * Get all enabled reminders
 */
export async function getEnabledReminders(): Promise<HabitReminder[]> {
    const all = await db.habitReminders.toArray();
    return all.filter(r => r.enabled);
}

/**
 * Toggle reminder enabled state
 */
export async function toggleReminder(habitId: string): Promise<boolean> {
    const reminder = await getReminderForHabit(habitId);
    if (!reminder) return false;

    const newState = !reminder.enabled;
    await db.habitReminders.update(reminder.id, {
        enabled: newState,
        updatedAt: new Date()
    });
    return newState;
}

/**
 * Delete reminder for a habit
 */
export async function deleteReminder(habitId: string): Promise<void> {
    const reminder = await getReminderForHabit(habitId);
    if (reminder) {
        await db.habitReminders.delete(reminder.id);
    }
}

/**
 * Format reminder for display
 */
export function formatReminderDescription(reminder: HabitReminder): string {
    switch (reminder.type) {
        case 'interval':
            if (reminder.intervalHours === 1) return 'Every hour';
            return `Every ${reminder.intervalHours} hours`;
        case 'daily':
            return `Daily at ${reminder.dailyTime}`;
        case 'random':
            return `Random nudge (${reminder.randomWindowStart} - ${reminder.randomWindowEnd})`;
        default:
            return 'No reminder';
    }
}

