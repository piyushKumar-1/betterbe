/**
 * Remote Data Layer
 * 
 * Implements DataLayer, AuthLayer, SharingLayer, and SyncLayer interfaces
 * using the BetterBe API backend.
 */

import type {
    Habit, CheckIn, Goal, GoalHabit, HabitReminder,
    DataLayer, AuthLayer, SharingLayer, SyncLayer,
    UserProfile, AuthResponse, SyncStatus, SharedGoal, ActivityFeedItem
} from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * API client with automatic token refresh
 */
class ApiClient {
    private accessToken: string | null = null;
    private refreshToken: string | null = null;

    constructor() {
        // Load tokens from localStorage
        if (typeof window !== 'undefined') {
            this.accessToken = localStorage.getItem('accessToken');
            this.refreshToken = localStorage.getItem('refreshToken');
        }
    }

    setTokens(access: string, refresh: string) {
        this.accessToken = access;
        this.refreshToken = refresh;
        if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', access);
            localStorage.setItem('refreshToken', refresh);
        }
    }

    clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
        }
    }

    isAuthenticated(): boolean {
        return !!this.accessToken;
    }

    async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
        const url = `${API_BASE}${path}`;
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.accessToken) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
        }

        let response = await fetch(url, { ...options, headers });

        // If unauthorized, try to refresh token
        if (response.status === 401 && this.refreshToken) {
            const refreshed = await this.tryRefreshToken();
            if (refreshed) {
                (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
                response = await fetch(url, { ...options, headers });
            }
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        return response.json();
    }

    private async tryRefreshToken(): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: this.refreshToken }),
            });

            if (response.ok) {
                const data: AuthResponse = await response.json();
                this.setTokens(data.accessToken, data.refreshToken);
                return true;
            }
        } catch (e) {
            console.error('Token refresh failed:', e);
        }

        this.clearTokens();
        return false;
    }
}

const api = new ApiClient();

/**
 * Remote Data Layer implementation
 */
export class RemoteDataLayer implements DataLayer {
    // ============ Habits ============

    async getActiveHabits(): Promise<Habit[]> {
        const habits = await api.fetch<any[]>('/api/habits');
        return habits.map(mapHabitFromApi);
    }

    async getHabit(id: string): Promise<Habit | undefined> {
        try {
            const habit = await api.fetch<any>(`/api/habits/${id}`);
            return mapHabitFromApi(habit);
        } catch {
            return undefined;
        }
    }

    async createHabit(input: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>): Promise<Habit> {
        const habit = await api.fetch<any>('/api/habits', {
            method: 'POST',
            body: JSON.stringify(mapHabitToApi(input)),
        });
        return mapHabitFromApi(habit);
    }

    async updateHabit(id: string, updates: Partial<Habit>): Promise<void> {
        await api.fetch(`/api/habits/${id}`, {
            method: 'PUT',
            body: JSON.stringify(mapHabitToApi(updates)),
        });
    }

    async archiveHabit(id: string): Promise<void> {
        await this.updateHabit(id, { archived: true });
    }

    async deleteHabit(id: string): Promise<void> {
        await api.fetch(`/api/habits/${id}`, { method: 'DELETE' });
    }

    // ============ Check-ins ============

    async getCheckInsForDate(date: Date): Promise<CheckIn[]> {
        const dateStr = date.toISOString().split('T')[0];
        const checkins = await api.fetch<any[]>(`/api/checkins/date/${dateStr}`);
        return checkins.map(mapCheckInFromApi);
    }

    async getCheckInsForHabit(habitId: string): Promise<CheckIn[]> {
        const checkins = await api.fetch<any[]>(`/api/checkins?habit_id=${habitId}`);
        return checkins.map(mapCheckInFromApi);
    }

    async createCheckIn(input: Omit<CheckIn, 'id' | 'timestamp'>): Promise<CheckIn> {
        const checkin = await api.fetch<any>('/api/checkins', {
            method: 'POST',
            body: JSON.stringify({
                habit_id: input.habitId,
                value: input.value,
                note: input.note,
                effective_date: input.effectiveDate,
            }),
        });
        return mapCheckInFromApi(checkin);
    }

    async updateCheckIn(id: string, updates: Partial<CheckIn>): Promise<void> {
        await api.fetch(`/api/checkins/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                value: updates.value,
                note: updates.note,
            }),
        });
    }

    async deleteCheckIn(id: string): Promise<void> {
        await api.fetch(`/api/checkins/${id}`, { method: 'DELETE' });
    }

    // ============ Goals ============

    async getActiveGoals(): Promise<Goal[]> {
        const goals = await api.fetch<any[]>('/api/goals');
        return goals.filter(g => g.status === 'active').map(mapGoalFromApi);
    }

    async getGoal(id: string): Promise<Goal | undefined> {
        try {
            const goal = await api.fetch<any>(`/api/goals/${id}`);
            return mapGoalFromApi(goal);
        } catch {
            return undefined;
        }
    }

    async createGoal(input: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>, habitIds?: string[]): Promise<Goal> {
        const goal = await api.fetch<any>('/api/goals', {
            method: 'POST',
            body: JSON.stringify({
                name: input.name,
                description: input.description,
                deadline: input.deadline,
                habit_ids: habitIds || [],
            }),
        });
        return mapGoalFromApi(goal);
    }

    async updateGoal(id: string, updates: Partial<Goal>): Promise<void> {
        await api.fetch(`/api/goals/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: updates.name,
                description: updates.description,
                deadline: updates.deadline,
                status: updates.status,
            }),
        });
    }

    async deleteGoal(id: string): Promise<void> {
        await api.fetch(`/api/goals/${id}`, { method: 'DELETE' });
    }

    // ============ Goal-Habit Links ============

    async getGoalHabits(goalId: string): Promise<GoalHabit[]> {
        const links = await api.fetch<any[]>(`/api/goals/${goalId}/habits`);
        return links.map(l => ({
            id: l.id,
            goalId: l.goal_id,
            habitId: l.habit_id,
            weight: l.weight,
        }));
    }

    async linkHabitToGoal(goalId: string, habitId: string, weight = 1): Promise<void> {
        await api.fetch(`/api/goals/${goalId}/habits`, {
            method: 'POST',
            body: JSON.stringify({ habit_id: habitId, weight }),
        });
    }

    async unlinkHabitFromGoal(goalId: string, habitId: string): Promise<void> {
        await api.fetch(`/api/goals/${goalId}/habits/${habitId}`, { method: 'DELETE' });
    }

    // ============ Reminders ============

    async getReminder(habitId: string): Promise<HabitReminder | undefined> {
        // Reminders are fetched with habits - this is a simplified version
        return undefined;
    }

    async upsertReminder(input: Omit<HabitReminder, 'id' | 'createdAt' | 'updatedAt'>): Promise<HabitReminder> {
        const reminder = await api.fetch<any>(`/api/habits/${input.habitId}/reminder`, {
            method: 'PUT',
            body: JSON.stringify({
                enabled: input.enabled,
                reminder_type: input.type,
                interval_hours: input.intervalHours,
                daily_time: input.dailyTime,
                random_window_start: input.randomWindowStart,
                random_window_end: input.randomWindowEnd,
            }),
        });
        return mapReminderFromApi(reminder);
    }

    async deleteReminder(habitId: string): Promise<void> {
        await api.fetch(`/api/habits/${habitId}/reminder`, {
            method: 'PUT',
            body: JSON.stringify({ enabled: false }),
        });
    }
}

/**
 * Auth Layer implementation
 */
export class RemoteAuthLayer implements AuthLayer {
    async initiateGoogleAuth(): Promise<string> {
        // Redirect to Google OAuth
        return `${API_BASE}/auth/google`;
    }

    async handleGoogleCallback(code: string): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE}/auth/google/callback?code=${code}`);
        const data = await response.json();
        api.setTokens(data.access_token, data.refresh_token);
        return mapAuthResponse(data);
    }

    async initiateAppleAuth(): Promise<{ clientId: string; redirectUri: string }> {
        return api.fetch('/auth/apple');
    }

    async handleAppleCallback(code: string, idToken: string, user?: string): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE}/auth/apple/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, id_token: idToken, user }),
        });
        const data = await response.json();
        api.setTokens(data.access_token, data.refresh_token);
        return mapAuthResponse(data);
    }

    async refreshToken(refreshToken: string): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });
        const data = await response.json();
        api.setTokens(data.access_token, data.refresh_token);
        return mapAuthResponse(data);
    }

    async logout(): Promise<void> {
        try {
            await api.fetch('/auth/logout', { method: 'POST' });
        } finally {
            api.clearTokens();
        }
    }

    async getCurrentUser(): Promise<UserProfile | null> {
        if (!api.isAuthenticated()) return null;
        try {
            const user = await api.fetch<any>('/auth/me');
            return mapUserProfile(user);
        } catch {
            return null;
        }
    }

    async updateUser(updates: Partial<UserProfile>): Promise<UserProfile> {
        const user = await api.fetch<any>('/auth/me', {
            method: 'PUT',
            body: JSON.stringify({
                name: updates.name,
                cloud_sync_enabled: updates.cloudSyncEnabled,
            }),
        });
        return mapUserProfile(user);
    }
}

/**
 * Sharing Layer implementation
 */
export class RemoteSharingLayer implements SharingLayer {
    async getSharedGoals(): Promise<SharedGoal[]> {
        const goals = await api.fetch<any[]>('/api/sharing/goals');
        return goals.map(mapSharedGoal);
    }

    async shareGoal(goalId: string, maxParticipants?: number): Promise<SharedGoal> {
        const shared = await api.fetch<any>(`/api/sharing/goals/${goalId}/share`, {
            method: 'POST',
            body: JSON.stringify({ goal_id: goalId, max_participants: maxParticipants }),
        });
        return mapSharedGoal(shared);
    }

    async getSharedGoal(id: string): Promise<SharedGoal> {
        const shared = await api.fetch<any>(`/api/sharing/goals/${id}`);
        return mapSharedGoal(shared);
    }

    async unshareGoal(id: string): Promise<void> {
        await api.fetch(`/api/sharing/goals/${id}`, { method: 'DELETE' });
    }

    async inviteUser(sharedGoalId: string, email: string): Promise<void> {
        await api.fetch(`/api/sharing/goals/${sharedGoalId}/invite`, {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    }

    async joinByCode(inviteCode: string): Promise<SharedGoal> {
        const shared = await api.fetch<any>('/api/sharing/join', {
            method: 'POST',
            body: JSON.stringify({ invite_code: inviteCode }),
        });
        return mapSharedGoal(shared);
    }

    async leaveSharedGoal(id: string): Promise<void> {
        await api.fetch(`/api/sharing/goals/${id}/leave`, { method: 'POST' });
    }

    async getActivityFeed(sharedGoalId: string): Promise<ActivityFeedItem[]> {
        const activities = await api.fetch<any[]>(`/api/sharing/goals/${sharedGoalId}/activity`);
        return activities.map(a => ({
            id: a.id,
            userName: a.user_name,
            userAvatar: a.user_avatar,
            activityType: a.activity_type,
            habitName: a.habit_name,
            message: a.message,
            createdAt: new Date(a.created_at),
        }));
    }
}

/**
 * Sync Layer implementation
 */
export class RemoteSyncLayer implements SyncLayer {
    async getSyncStatus(): Promise<SyncStatus> {
        const status = await api.fetch<any>('/api/sync/status');
        return {
            enabled: status.enabled,
            lastSync: status.last_sync ? new Date(status.last_sync) : undefined,
            habitsCount: status.habits_count,
            checkinsCount: status.checkins_count,
            goalsCount: status.goals_count,
        };
    }

    async enableCloudSync(): Promise<void> {
        await api.fetch('/api/sync/enable', { method: 'POST' });
    }

    async disableCloudSync(): Promise<void> {
        await api.fetch('/api/sync/disable', { method: 'POST' });
    }

    async pushData(): Promise<{ syncedHabits: number; syncedCheckins: number; syncedGoals: number }> {
        // This would gather local data and push to server
        // Implementation depends on local storage format
        const result = await api.fetch<any>('/api/sync/push', {
            method: 'POST',
            body: JSON.stringify({ /* local data */ }),
        });
        return {
            syncedHabits: result.synced_habits,
            syncedCheckins: result.synced_checkins,
            syncedGoals: result.synced_goals,
        };
    }

    async pullData(): Promise<void> {
        // This would pull remote data and store locally
        await api.fetch('/api/sync/pull');
    }
}

// ============ Mapping Functions ============

function mapHabitFromApi(h: any): Habit {
    return {
        id: h.id,
        name: h.name,
        description: h.description,
        type: h.habit_type,
        unit: h.unit,
        targetValue: h.target_value,
        targetDirection: h.target_direction?.replace('_', ' ') || 'at_least',
        archived: h.archived,
        createdAt: new Date(h.created_at),
        updatedAt: new Date(h.updated_at),
    };
}

function mapHabitToApi(h: Partial<Habit>): any {
    return {
        name: h.name,
        description: h.description,
        habit_type: h.type,
        unit: h.unit,
        target_value: h.targetValue,
        target_direction: h.targetDirection?.replace(' ', '_'),
        archived: h.archived,
    };
}

function mapCheckInFromApi(c: any): CheckIn {
    return {
        id: c.id,
        habitId: c.habit_id,
        value: c.value,
        timestamp: new Date(c.created_at),
        effectiveDate: c.effective_date,
        note: c.note,
    };
}

function mapGoalFromApi(g: any): Goal {
    return {
        id: g.id,
        name: g.name,
        description: g.description,
        deadline: g.deadline,
        status: g.status,
        createdAt: new Date(g.created_at),
        updatedAt: new Date(g.updated_at),
    };
}

function mapReminderFromApi(r: any): HabitReminder {
    return {
        id: r.id,
        habitId: r.habit_id,
        enabled: r.enabled,
        type: r.reminder_type,
        intervalHours: r.interval_hours,
        dailyTime: r.daily_time,
        randomWindowStart: r.random_window_start,
        randomWindowEnd: r.random_window_end,
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
    };
}

function mapAuthResponse(data: any): AuthResponse {
    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        user: mapUserProfile(data.user),
    };
}

function mapUserProfile(u: any): UserProfile {
    return {
        id: u.id,
        email: u.email,
        name: u.name,
        avatarUrl: u.avatar_url,
        cloudSyncEnabled: u.cloud_sync_enabled,
    };
}

function mapSharedGoal(sg: any): SharedGoal {
    return {
        id: sg.id,
        goal: mapGoalFromApi(sg.goal),
        inviteCode: sg.invite_code,
        participants: sg.participants.map((p: any) => ({
            userId: p.user_id,
            name: p.name,
            avatarUrl: p.avatar_url,
            role: p.role,
            joinedAt: new Date(p.joined_at),
        })),
        createdAt: new Date(sg.created_at),
    };
}

// Singleton instances
export const remoteData = new RemoteDataLayer();
export const remoteAuth = new RemoteAuthLayer();
export const remoteSharing = new RemoteSharingLayer();
export const remoteSync = new RemoteSyncLayer();

// Export API client for advanced usage
export { api as apiClient };

