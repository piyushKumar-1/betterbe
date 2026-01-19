/**
 * Data Layer - Unified Interface
 * 
 * This module provides a clean abstraction over storage:
 * - Local-first by default (IndexedDB)
 * - Optional cloud sync when user opts in
 * - Shared goals require cloud (with friendly opt-in)
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
 * Whether user has opted into cloud sync
 */
export const cloudSyncEnabled = writable<boolean>(false);

/**
 * Get the appropriate data layer based on user settings
 */
export function getDataLayer(): DataLayer {
    const syncEnabled = get(cloudSyncEnabled);
    const user = get(currentUser);

    // Use remote layer only if:
    // 1. User is authenticated
    // 2. User has opted into cloud sync
    if (user && syncEnabled && apiClient.isAuthenticated()) {
        return remoteData;
    }

    // Default to local storage
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
            cloudSyncEnabled.set(user.cloudSyncEnabled);
        }
    }
}

/**
 * Enable cloud sync for the current user
 * This is called when user opts in to cloud storage
 */
export async function enableCloudSync(): Promise<void> {
    const user = get(currentUser);
    if (!user) {
        throw new Error('Must be logged in to enable cloud sync');
    }

    await remoteSync.enableCloudSync();
    cloudSyncEnabled.set(true);

    // Push local data to cloud
    await syncLocalToCloud();
}

/**
 * Disable cloud sync
 */
export async function disableCloudSync(): Promise<void> {
    await remoteSync.disableCloudSync();
    cloudSyncEnabled.set(false);
}

/**
 * Sync local data to cloud
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
            habit_type: h.type,
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
 * Pull cloud data to local
 */
export async function syncCloudToLocal(): Promise<void> {
    await remoteSync.pullData();
    // The remote layer will update local storage
}

/**
 * Check if sharing features are available
 * (requires authentication and cloud sync)
 */
export function canUseSharing(): boolean {
    const user = get(currentUser);
    const syncEnabled = get(cloudSyncEnabled);
    return !!user && syncEnabled;
}

/**
 * Get a friendly message explaining why sharing isn't available
 */
export function getSharingRequirementsMessage(): string {
    const user = get(currentUser);
    
    if (!user) {
        return 'Sign in to share goals with friends';
    }
    
    if (!get(cloudSyncEnabled)) {
        return 'Enable cloud backup to share goals';
    }
    
    return '';
}

