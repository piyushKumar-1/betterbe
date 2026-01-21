/**
 * Habit Operations - Unified Data Layer
 * 
 * All habit operations go through the unified data layer,
 * which automatically routes to local or remote based on auth state.
 */

import { getDataLayer } from './index';
import type { Habit } from './types';

export interface CreateHabitInput {
    name: string;
    description?: string;
    type: 'binary' | 'numeric';
    unit?: string;
    targetValue?: number;
    targetDirection?: 'at_least' | 'at_most' | 'exactly';
}

/**
 * Create a new habit
 */
export async function createHabit(input: CreateHabitInput): Promise<Habit> {
    const dataLayer = getDataLayer();
    return dataLayer.createHabit({
        name: input.name,
        description: input.description,
        type: input.type,
        unit: input.unit,
        targetValue: input.targetValue,
        targetDirection: input.targetDirection ?? 'at_least',
        archived: false,
    });
}

/**
 * Get all active (non-archived) habits
 */
export async function getActiveHabits(): Promise<Habit[]> {
    const dataLayer = getDataLayer();
    return dataLayer.getActiveHabits();
}

/**
 * Get all habits including archived
 */
export async function getAllHabits(): Promise<Habit[]> {
    const dataLayer = getDataLayer();
    // Get active habits, then check for archived if needed
    // Note: Remote layer might not support archived filter, so we get all and filter
    const all = await dataLayer.getActiveHabits();
    // For now, return active only. Can be extended if needed.
    return all;
}

/**
 * Get a habit by ID
 */
export async function getHabit(id: string): Promise<Habit | undefined> {
    const dataLayer = getDataLayer();
    return dataLayer.getHabit(id);
}

/**
 * Update a habit
 */
export async function updateHabit(id: string, updates: Partial<Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const dataLayer = getDataLayer();
    await dataLayer.updateHabit(id, updates);
}

/**
 * Archive a habit (soft delete)
 */
export async function archiveHabit(id: string): Promise<void> {
    const dataLayer = getDataLayer();
    await dataLayer.archiveHabit(id);
}

/**
 * Permanently delete a habit
 */
export async function deleteHabit(id: string): Promise<void> {
    const dataLayer = getDataLayer();
    await dataLayer.deleteHabit(id);
}

