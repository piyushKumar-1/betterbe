/**
 * Local Data Layer
 * 
 * Implements DataLayer interface using IndexedDB (Dexie).
 * This is the default storage layer - all data stays on device.
 */

import { db, generateId, formatDate } from '$lib/db/schema';
import type { Habit, CheckIn, Goal, GoalHabit, HabitReminder, DataLayer } from './types';

export class LocalDataLayer implements DataLayer {
    // ============ Habits ============

    async getActiveHabits(): Promise<Habit[]> {
        const allHabits = await db.habits.toArray();
        return allHabits.filter(h => !h.archived);
    }

    async getHabit(id: string): Promise<Habit | undefined> {
        return db.habits.get(id);
    }

    async createHabit(input: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>): Promise<Habit> {
        const now = new Date();
        const habit: Habit = {
            id: generateId(),
            ...input,
            createdAt: now,
            updatedAt: now
        };
        await db.habits.add(habit);
        return habit;
    }

    async updateHabit(id: string, updates: Partial<Habit>): Promise<void> {
        await db.habits.update(id, {
            ...updates,
            updatedAt: new Date()
        });
    }

    async archiveHabit(id: string): Promise<void> {
        await this.updateHabit(id, { archived: true });
    }

    async deleteHabit(id: string): Promise<void> {
        await db.transaction('rw', [db.habits, db.checkIns, db.habitSchedules], async () => {
            await db.checkIns.where('habitId').equals(id).delete();
            await db.habitSchedules.where('habitId').equals(id).delete();
            await db.habits.delete(id);
        });
    }

    // ============ Check-ins ============

    async getCheckInsForDate(date: Date): Promise<CheckIn[]> {
        const dateStr = formatDate(date);
        return db.checkIns.where('effectiveDate').equals(dateStr).toArray();
    }

    async getCheckInsForHabit(habitId: string): Promise<CheckIn[]> {
        return db.checkIns.where('habitId').equals(habitId).toArray();
    }

    async createCheckIn(input: Omit<CheckIn, 'id' | 'timestamp'>): Promise<CheckIn> {
        const checkIn: CheckIn = {
            id: generateId(),
            ...input,
            timestamp: new Date()
        };
        await db.checkIns.add(checkIn);
        return checkIn;
    }

    async updateCheckIn(id: string, updates: Partial<CheckIn>): Promise<void> {
        await db.checkIns.update(id, updates);
    }

    async deleteCheckIn(id: string): Promise<void> {
        await db.checkIns.delete(id);
    }

    // ============ Goals ============

    async getActiveGoals(): Promise<Goal[]> {
        const allGoals = await db.goals.toArray();
        return allGoals.filter(g => g.status === 'active');
    }

    async getGoal(id: string): Promise<Goal | undefined> {
        return db.goals.get(id);
    }

    async createGoal(input: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>, habitIds?: string[]): Promise<Goal> {
        const now = new Date();
        const goal: Goal = {
            id: generateId(),
            ...input,
            createdAt: now,
            updatedAt: now
        };

        await db.transaction('rw', [db.goals, db.goalHabits], async () => {
            await db.goals.add(goal);
            
            if (habitIds) {
                for (const habitId of habitIds) {
                    await db.goalHabits.add({
                        id: generateId(),
                        goalId: goal.id,
                        habitId,
                        weight: 1
                    });
                }
            }
        });

        return goal;
    }

    async updateGoal(id: string, updates: Partial<Goal>): Promise<void> {
        await db.goals.update(id, {
            ...updates,
            updatedAt: new Date()
        });
    }

    async deleteGoal(id: string): Promise<void> {
        await db.transaction('rw', [db.goals, db.goalHabits, db.successCriteria], async () => {
            await db.goalHabits.where('goalId').equals(id).delete();
            await db.successCriteria.where('goalId').equals(id).delete();
            await db.goals.delete(id);
        });
    }

    // ============ Goal-Habit Links ============

    async getGoalHabits(goalId: string): Promise<GoalHabit[]> {
        return db.goalHabits.where('goalId').equals(goalId).toArray();
    }

    async linkHabitToGoal(goalId: string, habitId: string, weight = 1): Promise<void> {
        const existing = await db.goalHabits
            .where('[goalId+habitId]')
            .equals([goalId, habitId])
            .first();

        if (existing) {
            await db.goalHabits.update(existing.id, { weight });
        } else {
            await db.goalHabits.add({
                id: generateId(),
                goalId,
                habitId,
                weight
            });
        }
    }

    async unlinkHabitFromGoal(goalId: string, habitId: string): Promise<void> {
        await db.goalHabits
            .where('[goalId+habitId]')
            .equals([goalId, habitId])
            .delete();
    }

    // ============ Reminders ============

    async getReminder(habitId: string): Promise<HabitReminder | undefined> {
        return db.habitReminders.where('habitId').equals(habitId).first();
    }

    async upsertReminder(input: Omit<HabitReminder, 'id' | 'createdAt' | 'updatedAt'>): Promise<HabitReminder> {
        const existing = await this.getReminder(input.habitId);
        const now = new Date();

        if (existing) {
            await db.habitReminders.update(existing.id, {
                ...input,
                updatedAt: now
            });
            return { ...existing, ...input, updatedAt: now };
        }

        const reminder: HabitReminder = {
            id: generateId(),
            ...input,
            createdAt: now,
            updatedAt: now
        };
        await db.habitReminders.add(reminder);
        return reminder;
    }

    async deleteReminder(habitId: string): Promise<void> {
        await db.habitReminders.where('habitId').equals(habitId).delete();
    }
}

// Singleton instance
export const localData = new LocalDataLayer();

