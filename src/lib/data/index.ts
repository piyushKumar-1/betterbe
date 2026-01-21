/**
 * Data Layer - Unified Interface
 * 
 * This module provides a clean abstraction over storage:
 * - Personal mode: Local habits (private, on device)
 * - Social mode: Server habits (can be shared, synced across devices)
 * 
 * The app logic doesn't need to know which layer is being used.
 */

import { writable, get } from 'svelte/store';
import { db } from '$lib/db/schema';
import { localData, LocalDataLayer } from './local';
import { remoteData, remoteAuth, remoteSharing, remoteSync, apiClient, RemoteDataLayer } from './remote';
import type { DataLayer, UserProfile, SyncStatus } from './types';

// Re-export types
export * from './types';
export { localData } from './local';
export { remoteData, remoteAuth, remoteSharing, remoteSync } from './remote';

/**
 * Current user store
 */
export const currentUser = writable<UserProfile | null>(null);

/**
 * Whether user is in social mode (server-based habits)
 * When false, user is in personal mode (local habits)
 */
export const socialModeEnabled = writable<boolean>(false);

// Legacy alias for backward compatibility during migration
export const cloudSyncEnabled = socialModeEnabled;

/**
 * Get the appropriate data layer based on user settings
 * 
 * Personal mode: Returns localData (private habits on device)
 * Social mode: Returns remoteData (server habits, can be shared)
 */
export function getDataLayer(): DataLayer {
    const socialMode = get(socialModeEnabled);
    const user = get(currentUser);

    // Use remote layer (social mode) only if:
    // 1. User is authenticated
    // 2. User has enabled social mode
    if (user && socialMode && apiClient.isAuthenticated()) {
        return remoteData;
    }

    // Default to local storage (personal mode)
    return localData;
}

/**
 * Initialize the data layer on app start
 */
export async function initDataLayer(): Promise<void> {
    // Check if user is logged in
    if (apiClient.isAuthenticated()) {
        const user = await remoteAuth.getCurrentUser();
        if (user) {
            currentUser.set(user);
            socialModeEnabled.set(user.cloudSyncEnabled);

            // When social mode is enabled, we use server data exclusively
            // Personal and social habits are completely separate
            // Local data is only for personal mode
        }
    }
}

/**
 * Enable social mode (switch from personal to social habits)
 * Does NOT automatically migrate data - user must explicitly choose what to migrate
 */
export async function enableSocialMode(): Promise<void> {
    const user = get(currentUser);
    if (!user) {
        throw new Error('Must be logged in to enable social mode');
    }

    await remoteSync.enableCloudSync();
    socialModeEnabled.set(true);

    // No automatic migration - user will use migrateSelectedToCloud() to choose what to migrate
}

// Legacy alias
export const enableCloudSync = enableSocialMode;

/**
 * Disable social mode (switch back to personal habits)
 * Social habits remain on server but are hidden from UI
 */
export async function disableSocialMode(): Promise<void> {
    await remoteSync.disableCloudSync();
    socialModeEnabled.set(false);

    // When switching back to personal mode, social habits stay on server
    // User can switch back to social mode anytime to see them again
    // Personal and social habits remain separate
}

// Legacy alias
export const disableCloudSync = disableSocialMode;

/**
 * Clear all local data
 * Used when switching to cloud-only mode
 */
async function clearLocalData(): Promise<void> {
    try {
        // Clear all local data to avoid conflicts with server data
        await db.transaction('rw', [
            db.habits, db.checkIns, db.checkInContexts,
            db.goals, db.goalHabits, db.successCriteria,
            db.habitSchedules, db.habitReminders
        ], async () => {
            await db.habits.clear();
            await db.checkIns.clear();
            await db.checkInContexts.clear();
            await db.goals.clear();
            await db.goalHabits.clear();
            await db.successCriteria.clear();
            await db.habitSchedules.clear();
            await db.habitReminders.clear();
        });
    } catch (e) {
        console.error('Failed to clear local data:', e);
    }
}

/**
 * Sync local data to cloud (migrates ALL local data)
 * @deprecated Use migrateSelectedToCloud for selective migration
 */
export async function syncLocalToCloud(): Promise<{ habits: number; checkins: number; goals: number }> {
    // Get all local data (including archived)
    const allHabits = await db.habits.toArray();
    const allGoals = await db.goals.toArray();
    const allCheckIns = await db.checkIns.toArray();
    const allGoalHabits = await db.goalHabits.toArray();

    // Format data for backend
    const syncData = {
        habits: allHabits.map(h => ({
            local_id: h.id,
            name: h.name,
            description: h.description || null,
            habit_type: h.type.charAt(0).toUpperCase() + h.type.slice(1), // Backend expects Binary/Numeric
            unit: h.unit || null,
            target_value: h.targetValue || null,
            target_direction: h.targetDirection,
            archived: h.archived,
            created_at: h.createdAt.toISOString(),
            updated_at: h.updatedAt.toISOString(),
        })),
        check_ins: allCheckIns.map(c => ({
            local_id: c.id,
            habit_local_id: c.habitId,
            value: c.value,
            note: c.note || null,
            effective_date: c.effectiveDate,
            created_at: c.timestamp.toISOString(),
        })),
        goals: allGoals.map(g => ({
            local_id: g.id,
            name: g.name,
            description: g.description || null,
            deadline: g.deadline,
            status: g.status,
            created_at: g.createdAt.toISOString(),
            updated_at: g.updatedAt.toISOString(),
        })),
        goal_habits: allGoalHabits.map(gh => ({
            goal_local_id: gh.goalId,
            habit_local_id: gh.habitId,
            weight: gh.weight,
        })),
        synced_at: new Date().toISOString(),
    };

    // Push to server
    const result = await remoteSync.pushData(syncData);

    return {
        habits: result.syncedHabits,
        checkins: result.syncedCheckins,
        goals: result.syncedGoals,
    };
}

/**
 * Migrate selected habits and goals to cloud (social mode)
 * Only migrates the items explicitly selected by the user
 * Removes migrated items from local storage
 */
export async function migrateSelectedToCloud(
    habitIds: string[],
    goalIds: string[]
): Promise<{ habits: number; checkins: number; goals: number }> {
    // Get selected habits and their check-ins
    const selectedHabits = await db.habits.where('id').anyOf(habitIds).toArray();
    const selectedGoals = await db.goals.where('id').anyOf(goalIds).toArray();

    // Get check-ins for selected habits
    const selectedCheckIns = await db.checkIns.where('habitId').anyOf(habitIds).toArray();

    // Get goal-habit links for selected goals (only include if habit is also selected)
    const selectedGoalHabits = await db.goalHabits
        .where('goalId').anyOf(goalIds)
        .filter(gh => habitIds.includes(gh.habitId))
        .toArray();

    if (selectedHabits.length === 0 && selectedGoals.length === 0) {
        return { habits: 0, checkins: 0, goals: 0 };
    }

    // Format data for backend
    const syncData = {
        habits: selectedHabits.map(h => ({
            local_id: h.id,
            name: h.name,
            description: h.description || null,
            habit_type: h.type.charAt(0).toUpperCase() + h.type.slice(1),
            unit: h.unit || null,
            target_value: h.targetValue || null,
            target_direction: h.targetDirection,
            archived: h.archived,
            created_at: h.createdAt.toISOString(),
            updated_at: h.updatedAt.toISOString(),
        })),
        check_ins: selectedCheckIns.map(c => ({
            local_id: c.id,
            habit_local_id: c.habitId,
            value: c.value,
            note: c.note || null,
            effective_date: c.effectiveDate,
            created_at: c.timestamp.toISOString(),
        })),
        goals: selectedGoals.map(g => ({
            local_id: g.id,
            name: g.name,
            description: g.description || null,
            deadline: g.deadline,
            status: g.status,
            created_at: g.createdAt.toISOString(),
            updated_at: g.updatedAt.toISOString(),
        })),
        goal_habits: selectedGoalHabits.map(gh => ({
            goal_local_id: gh.goalId,
            habit_local_id: gh.habitId,
            weight: gh.weight,
        })),
        synced_at: new Date().toISOString(),
    };

    // Push to server
    const result = await remoteSync.pushData(syncData);

    // Remove migrated items from local storage
    await db.transaction('rw', [db.habits, db.checkIns, db.goals, db.goalHabits], async () => {
        // Delete check-ins for migrated habits
        await db.checkIns.where('habitId').anyOf(habitIds).delete();
        // Delete goal-habit links for migrated goals
        await db.goalHabits.where('goalId').anyOf(goalIds).delete();
        // Delete migrated habits
        await db.habits.where('id').anyOf(habitIds).delete();
        // Delete migrated goals
        await db.goals.where('id').anyOf(goalIds).delete();
    });

    return {
        habits: result.syncedHabits,
        checkins: result.syncedCheckins,
        goals: result.syncedGoals,
    };
}

/**
 * Check if there is local data that could be migrated
 */
export async function hasLocalData(): Promise<{ habits: number; goals: number }> {
    const habitsCount = await db.habits.count();
    const goalsCount = await db.goals.count();
    return { habits: habitsCount, goals: goalsCount };
}

/**
 * Get all local habits and goals for migration selection
 */
export async function getLocalDataForMigration(): Promise<{
    habits: Array<{ id: string; name: string; type: string }>;
    goals: Array<{ id: string; name: string; deadline: string }>;
}> {
    const habits = await db.habits.toArray();
    const goals = await db.goals.toArray();

    return {
        habits: habits.map(h => ({ id: h.id, name: h.name, type: h.type })),
        goals: goals.map(g => ({ id: g.id, name: g.name, deadline: g.deadline })),
    };
}

/**
 * Pull cloud data to local
 * Only used when disabling cloud sync to migrate server data to local
 */
export async function syncCloudToLocal(): Promise<void> {
    const syncData = await remoteSync.pullData();

    // Clear existing local data first
    await clearLocalData();

    // Import server data to local
    for (const habit of syncData.habits) {
        try {
            await localData.createHabit({
                name: habit.name,
                description: habit.description || undefined,
                type: habit.habit_type as 'binary' | 'numeric',
                unit: habit.unit || undefined,
                targetValue: habit.target_value || undefined,
                targetDirection: habit.target_direction as 'at_least' | 'at_most' | 'exactly',
                archived: habit.archived,
            });
        } catch (e) {
            console.warn('Failed to sync habit to local:', e);
        }
    }

    // Import check-ins
    for (const checkIn of syncData.check_ins) {
        try {
            // Find the habit by matching name or create a mapping
            // For now, we'll need to match by local_id or name
            const habits = await localData.getActiveHabits();
            const habit = habits.find(h => h.name === checkIn.habit_local_id); // This is a simplified match
            // Better approach: store a mapping of server IDs to local IDs
            // For now, we'll skip check-ins that don't match
            if (habit) {
                await localData.createCheckIn({
                    habitId: habit.id,
                    value: checkIn.value,
                    effectiveDate: checkIn.effective_date,
                    note: checkIn.note || undefined,
                });
            }
        } catch (e) {
            console.warn('Failed to sync check-in to local:', e);
        }
    }

    // Import goals
    for (const goal of syncData.goals) {
        try {
            await localData.createGoal({
                name: goal.name,
                description: goal.description || undefined,
                deadline: goal.deadline,
                status: goal.status as 'active' | 'achieved' | 'failed' | 'abandoned',
            });
        } catch (e) {
            console.warn('Failed to sync goal to local:', e);
        }
    }
}

/**
 * Check if sharing features are available
 * (requires authentication and social mode)
 */
export function canUseSharing(): boolean {
    const user = get(currentUser);
    const socialMode = get(socialModeEnabled);
    return !!user && socialMode;
}

/**
 * Get a friendly message explaining why sharing isn't available
 */
export function getSharingRequirementsMessage(): string {
    const user = get(currentUser);

    if (!user) {
        return 'Sign in to share goals with friends';
    }

    if (!get(socialModeEnabled)) {
        return 'Switch to social mode to share goals';
    }

    return '';
}

/**
 * Delete all data (habits, check-ins, goals, etc.)
 * Works for both personal and social modes
 * Deletes only from the current mode (personal or social)
 */
export async function deleteAllData(): Promise<void> {
    const socialMode = get(socialModeEnabled);
    const user = get(currentUser);

    if (socialMode && user && apiClient.isAuthenticated()) {
        // Delete all social habits from server
        const habits = await remoteData.getActiveHabits();
        const allGoals = await remoteData.getActiveGoals();

        // Delete all social habits
        const habitDeletePromises = habits.map(habit =>
            remoteData.deleteHabit(habit.id).catch(e => {
                console.error(`Failed to delete habit ${habit.id}:`, e);
            })
        );
        await Promise.all(habitDeletePromises);

        // Delete all social goals
        const goalDeletePromises = allGoals.map(goal =>
            remoteData.deleteGoal(goal.id).catch(e => {
                console.error(`Failed to delete goal ${goal.id}:`, e);
            })
        );
        await Promise.all(goalDeletePromises);

        // Personal habits remain untouched (they're separate)
    } else {
        // Delete all personal habits from local storage
        await clearLocalData();
        // Social habits remain untouched (they're separate)
    }
}

