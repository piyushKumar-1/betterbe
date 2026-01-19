/**
 * BetterBe Database Schema
 * 
 * Local-first IndexedDB storage using Dexie.js
 * All data stays on device unless user explicitly syncs.
 */

import Dexie, { type EntityTable } from 'dexie';

// ============ Types ============

export type HabitType = 'binary' | 'numeric';
export type TargetDirection = 'at_least' | 'at_most' | 'exactly';
export type GoalStatus = 'active' | 'achieved' | 'failed' | 'abandoned';
export type ContextType = 'time_of_day' | 'day_of_week' | 'location' | 'tag';
export type ScheduleType = 'daily' | 'weekly' | 'custom';
export type CriteriaType = 'completion_rate' | 'total_value' | 'streak' | 'average';
export type EvaluationWindow = 'total' | 'last_n_days';
export type ReminderType = 'interval' | 'daily' | 'random';

// ============ Entities ============

export interface Habit {
    id: string;
    name: string;
    description?: string;
    type: HabitType;
    unit?: string;
    targetValue?: number;
    targetDirection: TargetDirection;
    archived: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CheckIn {
    id: string;
    habitId: string;
    value: number;
    timestamp: Date;
    effectiveDate: string; // YYYY-MM-DD format for indexing
    note?: string;
}

export interface CheckInContext {
    id: string;
    checkInId: string;
    type: ContextType;
    value: string;
}

export interface Goal {
    id: string;
    name: string;
    description?: string;
    deadline: string; // YYYY-MM-DD
    status: GoalStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface GoalHabit {
    id: string;
    goalId: string;
    habitId: string;
    weight: number;
}

export interface SuccessCriterion {
    id: string;
    goalId: string;
    habitId: string;
    criteriaType: CriteriaType;
    targetValue: number;
    evaluationWindow: EvaluationWindow;
    windowDays?: number;
}

export interface HabitSchedule {
    id: string;
    habitId: string;
    type: ScheduleType;
    daysOfWeek?: number[]; // 0-6, Sunday = 0
    timesPerPeriod?: number;
    validFrom: string; // YYYY-MM-DD
    validUntil?: string;
}

export interface HabitReminder {
    id: string;
    habitId: string;
    enabled: boolean;
    type: ReminderType;
    // For 'interval' type: how often to remind (in hours)
    intervalHours?: number;
    // For 'daily' type: specific time (HH:MM format)
    dailyTime?: string;
    // For 'random' type: time window start/end (HH:MM format)
    randomWindowStart?: string;
    randomWindowEnd?: string;
    createdAt: Date;
    updatedAt: Date;
}

// ============ Database ============

export class BetterBeDB extends Dexie {
    habits!: EntityTable<Habit, 'id'>;
    checkIns!: EntityTable<CheckIn, 'id'>;
    checkInContexts!: EntityTable<CheckInContext, 'id'>;
    goals!: EntityTable<Goal, 'id'>;
    goalHabits!: EntityTable<GoalHabit, 'id'>;
    successCriteria!: EntityTable<SuccessCriterion, 'id'>;
    habitSchedules!: EntityTable<HabitSchedule, 'id'>;
    habitReminders!: EntityTable<HabitReminder, 'id'>;

    constructor() {
        super('betterbe');

        this.version(1).stores({
            habits: 'id, name, type, archived, createdAt',
            checkIns: 'id, habitId, effectiveDate, timestamp, [habitId+effectiveDate]',
            checkInContexts: 'id, checkInId, type',
            goals: 'id, status, deadline',
            goalHabits: 'id, goalId, habitId, [goalId+habitId]',
            successCriteria: 'id, goalId, habitId',
            habitSchedules: 'id, habitId, validFrom'
        });

        // Version 2: Add habit reminders
        this.version(2).stores({
            habits: 'id, name, type, archived, createdAt',
            checkIns: 'id, habitId, effectiveDate, timestamp, [habitId+effectiveDate]',
            checkInContexts: 'id, checkInId, type',
            goals: 'id, status, deadline',
            goalHabits: 'id, goalId, habitId, [goalId+habitId]',
            successCriteria: 'id, goalId, habitId',
            habitSchedules: 'id, habitId, validFrom',
            habitReminders: 'id, habitId, enabled, type'
        });
    }
}

// Singleton instance
export const db = new BetterBeDB();

// ============ Utilities ============

/**
 * Generate a UUID v4
 */
export function generateId(): string {
    return crypto.randomUUID();
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * Parse YYYY-MM-DD to Date (at midnight local time)
 */
export function parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}
