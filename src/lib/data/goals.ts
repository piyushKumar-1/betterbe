/**
 * Goal Operations - Unified Data Layer
 */

import { getDataLayer } from './index';
import type { Goal, GoalHabit } from './types';

export interface CreateGoalInput {
    name: string;
    description?: string;
    deadline: string; // YYYY-MM-DD format
    habitIds?: string[];
}

/**
 * Create a new goal
 */
export async function createGoal(input: CreateGoalInput): Promise<Goal> {
    const dataLayer = getDataLayer();
    return dataLayer.createGoal({
        name: input.name,
        description: input.description,
        deadline: input.deadline,
        status: 'active',
    }, input.habitIds);
}

/**
 * Get all active goals
 */
export async function getActiveGoals(): Promise<Goal[]> {
    const dataLayer = getDataLayer();
    return dataLayer.getActiveGoals();
}

/**
 * Get a goal by ID
 */
export async function getGoal(id: string): Promise<Goal | undefined> {
    const dataLayer = getDataLayer();
    return dataLayer.getGoal(id);
}

/**
 * Update a goal
 */
export async function updateGoal(id: string, updates: Partial<Goal>): Promise<void> {
    const dataLayer = getDataLayer();
    await dataLayer.updateGoal(id, updates);
}

/**
 * Delete a goal
 */
export async function deleteGoal(id: string): Promise<void> {
    const dataLayer = getDataLayer();
    await dataLayer.deleteGoal(id);
}

/**
 * Get goal-habit links
 */
export async function getGoalHabits(goalId: string): Promise<GoalHabit[]> {
    const dataLayer = getDataLayer();
    return dataLayer.getGoalHabits(goalId);
}

/**
 * Link a habit to a goal
 */
export async function linkHabitToGoal(goalId: string, habitId: string, weight = 1): Promise<void> {
    const dataLayer = getDataLayer();
    await dataLayer.linkHabitToGoal(goalId, habitId, weight);
}

/**
 * Unlink a habit from a goal
 */
export async function unlinkHabitFromGoal(goalId: string, habitId: string): Promise<void> {
    const dataLayer = getDataLayer();
    await dataLayer.unlinkHabitFromGoal(goalId, habitId);
}

/**
 * Update goal status
 */
export async function updateGoalStatus(id: string, status: 'active' | 'achieved' | 'failed' | 'abandoned'): Promise<void> {
    const dataLayer = getDataLayer();
    await dataLayer.updateGoal(id, { status });
}

/**
 * Update habits linked to a goal
 */
export async function updateGoalHabits(goalId: string, habitIds: string[]): Promise<void> {
    const dataLayer = getDataLayer();
    // Get existing links
    const existing = await dataLayer.getGoalHabits(goalId);
    
    // Remove all existing links
    for (const link of existing) {
        await dataLayer.unlinkHabitFromGoal(goalId, link.habitId);
    }
    
    // Add new links with equal weight
    const weight = habitIds.length > 0 ? 1 / habitIds.length : 1;
    for (const habitId of habitIds) {
        await dataLayer.linkHabitToGoal(goalId, habitId, weight);
    }
}

