/**
 * Check-in CRUD Operations
 */

import { db, generateId, formatDate, type CheckIn, type CheckInContext, type ContextType } from './schema';

export interface CreateCheckInInput {
    habitId: string;
    value: number;
    effectiveDate?: Date; // defaults to today
    note?: string;
    contexts?: Array<{ type: ContextType; value: string }>;
}

/**
 * Create a new check-in
 */
export async function createCheckIn(input: CreateCheckInInput): Promise<CheckIn> {
    const now = new Date();
    const effectiveDate = input.effectiveDate ?? now;

    const checkIn: CheckIn = {
        id: generateId(),
        habitId: input.habitId,
        value: input.value,
        timestamp: now,
        effectiveDate: formatDate(effectiveDate),
        note: input.note
    };

    await db.transaction('rw', [db.checkIns, db.checkInContexts], async () => {
        await db.checkIns.add(checkIn);

        // Add contexts if provided
        if (input.contexts && input.contexts.length > 0) {
            const contexts: CheckInContext[] = input.contexts.map(ctx => ({
                id: generateId(),
                checkInId: checkIn.id,
                type: ctx.type,
                value: ctx.value
            }));
            await db.checkInContexts.bulkAdd(contexts);
        }
    });

    return checkIn;
}

/**
 * Get check-in for a specific habit on a specific date
 */
export async function getCheckIn(habitId: string, date: Date): Promise<CheckIn | undefined> {
    const dateStr = formatDate(date);
    return db.checkIns
        .where('[habitId+effectiveDate]')
        .equals([habitId, dateStr])
        .first();
}

/**
 * Get all check-ins for a date
 */
export async function getCheckInsForDate(date: Date): Promise<CheckIn[]> {
    const dateStr = formatDate(date);
    return db.checkIns.where('effectiveDate').equals(dateStr).toArray();
}

/**
 * Get check-ins for a habit within a date range
 */
export async function getCheckInsForHabit(
    habitId: string,
    startDate: Date,
    endDate: Date
): Promise<CheckIn[]> {
    const start = formatDate(startDate);
    const end = formatDate(endDate);

    return db.checkIns
        .where('habitId')
        .equals(habitId)
        .and(c => c.effectiveDate >= start && c.effectiveDate <= end)
        .toArray();
}

/**
 * Get all check-ins for a habit (for analytics)
 */
export async function getAllCheckInsForHabit(habitId: string): Promise<CheckIn[]> {
    return db.checkIns.where('habitId').equals(habitId).sortBy('effectiveDate');
}

/**
 * Update a check-in value
 */
export async function updateCheckIn(id: string, updates: { value?: number; note?: string }): Promise<void> {
    await db.checkIns.update(id, updates);
}

/**
 * Delete a check-in
 */
export async function deleteCheckIn(id: string): Promise<void> {
    await db.transaction('rw', [db.checkIns, db.checkInContexts], async () => {
        await db.checkInContexts.where('checkInId').equals(id).delete();
        await db.checkIns.delete(id);
    });
}

/**
 * Get contexts for a check-in
 */
export async function getCheckInContexts(checkInId: string): Promise<CheckInContext[]> {
    return db.checkInContexts.where('checkInId').equals(checkInId).toArray();
}

/**
 * Toggle binary check-in (create or delete)
 * Returns true if check-in now exists, false if removed
 */
export async function toggleBinaryCheckIn(habitId: string, date: Date): Promise<boolean> {
    const existing = await getCheckIn(habitId, date);

    if (existing) {
        await deleteCheckIn(existing.id);
        return false;
    } else {
        await createCheckIn({ habitId, value: 1, effectiveDate: date });
        return true;
    }
}
