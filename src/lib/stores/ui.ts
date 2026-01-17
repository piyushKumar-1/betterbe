/**
 * Svelte stores for UI state and habits
 */

import { writable, derived } from 'svelte/store';
import type { Habit, CheckIn } from '$lib/db/schema';

// Selected date for check-ins (defaults to today)
function createSelectedDate() {
    const { subscribe, set, update } = writable(new Date());

    return {
        subscribe,
        set,
        setToday: () => set(new Date()),
        goBack: () => update(d => {
            const newDate = new Date(d);
            newDate.setDate(newDate.getDate() - 1);
            return newDate;
        }),
        goForward: () => update(d => {
            const newDate = new Date(d);
            newDate.setDate(newDate.getDate() + 1);
            return newDate;
        })
    };
}

export const selectedDate = createSelectedDate();

// Formatted selected date
export const formattedDate = derived(selectedDate, ($date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateStr = $date.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';

    return $date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
});

// Is selected date today?
export const isToday = derived(selectedDate, ($date) => {
    const today = new Date();
    return $date.toISOString().split('T')[0] === today.toISOString().split('T')[0];
});

// Active habits cache
export const habits = writable<Habit[]>([]);

// Today's check-ins cache
export const todayCheckIns = writable<Map<string, CheckIn>>(new Map());

// Loading state
export const isLoading = writable(false);
