/**
 * Data Layer Types
 * 
 * Shared types for both local and remote data layers.
 */

import type { Habit, CheckIn, Goal, GoalHabit, HabitReminder } from '$lib/db/schema';

// Re-export schema types
export type { Habit, CheckIn, Goal, GoalHabit, HabitReminder };

/**
 * User profile from the API
 */
export interface UserProfile {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
    cloudSyncEnabled: boolean;
}

/**
 * Auth response from OAuth
 */
export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: UserProfile;
}

/**
 * Sync status
 */
export interface SyncStatus {
    enabled: boolean;
    lastSync?: Date;
    habitsCount: number;
    checkinsCount: number;
    goalsCount: number;
}

/**
 * Shared goal
 */
export interface SharedGoal {
    id: string;
    goal: Goal;
    inviteCode: string;
    participants: Participant[];
    createdAt: Date;
}

export interface Participant {
    userId: string;
    name?: string;
    avatarUrl?: string;
    role: 'owner' | 'collaborator' | 'viewer';
    joinedAt: Date;
}

/**
 * Activity feed item
 */
export interface ActivityFeedItem {
    id: string;
    userName?: string;
    userAvatar?: string;
    activityType: 'check_in' | 'streak_milestone' | 'goal_progress' | 'joined_goal' | 'encouragement';
    habitName?: string;
    message?: string;
    createdAt: Date;
}

/**
 * Data layer interface - implemented by both local and remote layers
 */
export interface DataLayer {
    // Habits
    getActiveHabits(): Promise<Habit[]>;
    getHabit(id: string): Promise<Habit | undefined>;
    createHabit(habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>): Promise<Habit>;
    updateHabit(id: string, updates: Partial<Habit>): Promise<void>;
    archiveHabit(id: string): Promise<void>;
    deleteHabit(id: string): Promise<void>;

    // Check-ins
    getCheckInsForDate(date: Date): Promise<CheckIn[]>;
    getCheckInsForHabit(habitId: string): Promise<CheckIn[]>;
    createCheckIn(checkIn: Omit<CheckIn, 'id' | 'timestamp'>): Promise<CheckIn>;
    updateCheckIn(id: string, updates: Partial<CheckIn>): Promise<void>;
    deleteCheckIn(id: string): Promise<void>;

    // Goals
    getActiveGoals(): Promise<Goal[]>;
    getGoal(id: string): Promise<Goal | undefined>;
    createGoal(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>, habitIds?: string[]): Promise<Goal>;
    updateGoal(id: string, updates: Partial<Goal>): Promise<void>;
    deleteGoal(id: string): Promise<void>;

    // Goal-Habit links
    getGoalHabits(goalId: string): Promise<GoalHabit[]>;
    linkHabitToGoal(goalId: string, habitId: string, weight?: number): Promise<void>;
    unlinkHabitFromGoal(goalId: string, habitId: string): Promise<void>;

    // Reminders
    getReminder(habitId: string): Promise<HabitReminder | undefined>;
    upsertReminder(reminder: Omit<HabitReminder, 'id' | 'createdAt' | 'updatedAt'>): Promise<HabitReminder>;
    deleteReminder(habitId: string): Promise<void>;
}

/**
 * Auth layer interface - for remote only
 */
export interface AuthLayer {
    // OAuth
    initiateGoogleAuth(): Promise<string>; // Returns redirect URL
    handleGoogleCallback(code: string): Promise<AuthResponse>;
    initiateAppleAuth(): Promise<{ clientId: string; redirectUri: string }>;
    handleAppleCallback(code: string, idToken: string, user?: string): Promise<AuthResponse>;
    
    // Token management
    refreshToken(refreshToken: string): Promise<AuthResponse>;
    logout(): Promise<void>;
    
    // User
    getCurrentUser(): Promise<UserProfile | null>;
    updateUser(updates: Partial<UserProfile>): Promise<UserProfile>;
}

/**
 * Sharing layer interface - for remote only
 */
export interface SharingLayer {
    // Shared goals
    getSharedGoals(): Promise<SharedGoal[]>;
    shareGoal(goalId: string, maxParticipants?: number): Promise<SharedGoal>;
    getSharedGoal(id: string): Promise<SharedGoal>;
    unshareGoal(id: string): Promise<void>;
    
    // Invites
    inviteUser(sharedGoalId: string, email: string): Promise<void>;
    joinByCode(inviteCode: string): Promise<SharedGoal>;
    leaveSharedGoal(id: string): Promise<void>;
    
    // Activity
    getActivityFeed(sharedGoalId: string): Promise<ActivityFeedItem[]>;
}

/**
 * Sync layer interface - for remote only
 */
export interface SyncLayer {
    getSyncStatus(): Promise<SyncStatus>;
    enableCloudSync(): Promise<void>;
    disableCloudSync(): Promise<void>;
    pushData(): Promise<{ syncedHabits: number; syncedCheckins: number; syncedGoals: number }>;
    pullData(): Promise<void>;
}

