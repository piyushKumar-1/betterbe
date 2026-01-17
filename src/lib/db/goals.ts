/**
 * Goal CRUD Operations
 */

import { db, generateId, formatDate, type Goal, type GoalHabit, type GoalStatus } from './schema';

export interface CreateGoalInput {
    name: string;
    description?: string;
    deadline: Date;
    habitIds?: string[]; // Goals can link to multiple habits
}

/**
 * Create a new goal
 */
export async function createGoal(input: CreateGoalInput): Promise<Goal> {
    const now = new Date();
    const goal: Goal = {
        id: generateId(),
        name: input.name,
        description: input.description,
        deadline: formatDate(input.deadline),
        status: 'active',
        createdAt: now,
        updatedAt: now
    };

    await db.transaction('rw', [db.goals, db.goalHabits], async () => {
        await db.goals.add(goal);

        // Link habits if provided
        if (input.habitIds && input.habitIds.length > 0) {
            const weight = 1 / input.habitIds.length; // Equal weight for all
            for (const habitId of input.habitIds) {
                const goalHabit: GoalHabit = {
                    id: generateId(),
                    goalId: goal.id,
                    habitId,
                    weight
                };
                await db.goalHabits.add(goalHabit);
            }
        }
    });

    return goal;
}

/**
 * Get all active goals
 */
export async function getActiveGoals(): Promise<Goal[]> {
    return db.goals.where('status').equals('active').toArray();
}

/**
 * Get all goals
 */
export async function getAllGoals(): Promise<Goal[]> {
    return db.goals.toArray();
}

/**
 * Get a goal by ID
 */
export async function getGoal(id: string): Promise<Goal | undefined> {
    return db.goals.get(id);
}

/**
 * Get habits linked to a goal
 */
export async function getGoalHabits(goalId: string): Promise<GoalHabit[]> {
    return db.goalHabits.where('goalId').equals(goalId).toArray();
}

/**
 * Update goal status
 */
export async function updateGoalStatus(id: string, status: GoalStatus): Promise<void> {
    await db.goals.update(id, {
        status,
        updatedAt: new Date()
    });
}

/**
 * Update goal details
 */
export async function updateGoal(id: string, updates: Partial<Pick<Goal, 'name' | 'description' | 'deadline'>>): Promise<void> {
    await db.goals.update(id, {
        ...updates,
        updatedAt: new Date()
    });
}

/**
 * Delete a goal and its links
 */
export async function deleteGoal(id: string): Promise<void> {
    await db.transaction('rw', [db.goals, db.goalHabits, db.successCriteria], async () => {
        await db.successCriteria.where('goalId').equals(id).delete();
        await db.goalHabits.where('goalId').equals(id).delete();
        await db.goals.delete(id);
    });
}
