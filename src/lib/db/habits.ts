/**
 * Habit CRUD Operations
 */

import { db, generateId, type Habit, type HabitType, type TargetDirection } from './schema';

export interface CreateHabitInput {
    name: string;
    description?: string;
    type: HabitType;
    unit?: string;
    targetValue?: number;
    targetDirection?: TargetDirection;
}

/**
 * Create a new habit
 */
export async function createHabit(input: CreateHabitInput): Promise<Habit> {
    const now = new Date();
    const habit: Habit = {
        id: generateId(),
        name: input.name,
        description: input.description,
        type: input.type,
        unit: input.unit,
        targetValue: input.targetValue,
        targetDirection: input.targetDirection ?? 'at_least',
        archived: false,
        createdAt: now,
        updatedAt: now
    };

    await db.habits.add(habit);
    return habit;
}

/**
 * Get all active (non-archived) habits
 */
export async function getActiveHabits(): Promise<Habit[]> {
    // Filter in memory since Dexie's equals() doesn't work well with boolean false
    const allHabits = await db.habits.toArray();
    return allHabits.filter(h => !h.archived);
}

/**
 * Get all habits including archived
 */
export async function getAllHabits(): Promise<Habit[]> {
    return db.habits.toArray();
}

/**
 * Get a habit by ID
 */
export async function getHabit(id: string): Promise<Habit | undefined> {
    return db.habits.get(id);
}

/**
 * Update a habit
 */
export async function updateHabit(id: string, updates: Partial<Omit<Habit, 'id' | 'createdAt'>>): Promise<void> {
    await db.habits.update(id, {
        ...updates,
        updatedAt: new Date()
    });
}

/**
 * Archive a habit (soft delete)
 */
export async function archiveHabit(id: string): Promise<void> {
    await updateHabit(id, { archived: true });
}

/**
 * Permanently delete a habit and all its check-ins
 */
export async function deleteHabit(id: string): Promise<void> {
    await db.transaction('rw', [db.habits, db.checkIns, db.checkInContexts, db.habitSchedules], async () => {
        // Delete related check-in contexts
        const checkIns = await db.checkIns.where('habitId').equals(id).toArray();
        const checkInIds = checkIns.map(c => c.id);
        await db.checkInContexts.where('checkInId').anyOf(checkInIds).delete();

        // Delete check-ins
        await db.checkIns.where('habitId').equals(id).delete();

        // Delete schedules
        await db.habitSchedules.where('habitId').equals(id).delete();

        // Delete habit
        await db.habits.delete(id);
    });
}
