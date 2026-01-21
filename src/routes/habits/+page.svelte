<!--
	Habits List Page - Native Mobile Feel
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { getAllHabits } from '$lib/data/habits';
	import { calculateMomentum } from '$lib/analytics/momentum';
	import { calculateStreaks } from '$lib/analytics/streaks';
	import type { Habit } from '$lib/db/schema';
	import type { MomentumData } from '$lib/analytics/momentum';
	import type { StreakData } from '$lib/analytics/streaks';
	import { Plus, ChevronRight, Flame, Trophy, TrendingUp, TrendingDown, Minus, Eye, EyeOff } from 'lucide-svelte';

	let habits = $state<Habit[]>([]);
	let momentum = $state<Map<string, MomentumData>>(new Map());
	let streaks = $state<Map<string, StreakData>>(new Map());
	let loading = $state(true);
	let showArchived = $state(false);

	async function loadHabits() {
		loading = true;
		habits = await getAllHabits();
		loading = false;

		// Load analytics in background
		loadAnalytics(habits);
	}

	async function loadAnalytics(allHabits: Habit[]) {
		// Calculate all in parallel
		const results = await Promise.all(
			allHabits.map(async (habit) => ({
				id: habit.id,
				m: await calculateMomentum(habit.id),
				s: await calculateStreaks(habit.id)
			}))
		);

		const momentumMap = new Map<string, MomentumData>();
		const streakMap = new Map<string, StreakData>();
		
		results.forEach(r => {
			momentumMap.set(r.id, r.m);
			streakMap.set(r.id, r.s);
		});

		momentum = momentumMap;
		streaks = streakMap;
	}

	onMount(() => {
		loadHabits();
	});

	function getDisplayedHabits(): Habit[] {
		if (showArchived) return habits;
		return habits.filter(h => !h.archived);
	}

	function getMomentumIcon(direction: string) {
		if (direction === 'improving') return TrendingUp;
		if (direction === 'declining') return TrendingDown;
		return Minus;
	}

	function getMomentumColor(direction: string): string {
		if (direction === 'improving') return 'var(--color-success)';
		if (direction === 'declining') return 'var(--color-warning)';
		return 'var(--color-text-muted)';
	}
</script>

<div class="container">
	<!-- Large Title -->
	<header class="header">
		<h1>Habits</h1>
		<a href="{base}/habits/new" class="btn btn-primary">
			<Plus size={20} strokeWidth={2.5} />
			New
		</a>
	</header>

	<!-- Filter Toggle -->
	<div class="filter-row">
		<button 
			class="filter-toggle"
			class:active={showArchived}
			onclick={() => showArchived = !showArchived}
		>
			{#if showArchived}
				<EyeOff size={16} />
			{:else}
				<Eye size={16} />
			{/if}
			{showArchived ? 'Hide' : 'Show'} archived
		</button>
	</div>

	{#if loading}
		<div class="habits-list">
			{#each [1, 2, 3] as _}
				<div class="habit-row skeleton-row">
					<div style="flex: 1;">
						<div class="skeleton" style="width: 60%; height: 18px; margin-bottom: 8px;"></div>
						<div class="skeleton" style="width: 40%; height: 14px;"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if getDisplayedHabits().length === 0}
		<div class="empty-state">
			<span class="empty-icon">📊</span>
			<h3>No habits yet</h3>
			<p>Track what matters to you</p>
			<a href="{base}/habits/new" class="btn btn-primary">
				<Plus size={20} />
				Create Habit
			</a>
		</div>
	{:else}
		<div class="habits-list">
			{#each getDisplayedHabits() as habit, i (habit.id)}
				{@const m = momentum.get(habit.id)}
				{@const s = streaks.get(habit.id)}

				<a 
					href="{base}/habits/{habit.id}" 
					class="habit-row animate-slide-up"
					class:archived={habit.archived}
					style="animation-delay: {i * 40}ms"
				>
					<div class="habit-content">
						<span class="habit-name">{habit.name}</span>
						<div class="habit-stats">
							{#if s && s.currentStreak > 0}
								<span class="stat-item">
									<Flame size={14} />
									{s.currentStreak}
								</span>
							{/if}
							{#if s && s.longestStreak > 0}
								<span class="stat-item best">
									<Trophy size={14} />
									{s.longestStreak}
								</span>
							{/if}
							{#if m}
								<span class="stat-item" style="color: {getMomentumColor(m.direction)}">
									<svelte:component this={getMomentumIcon(m.direction)} size={14} />
								</span>
							{/if}
						</div>
					</div>
					<ChevronRight size={20} class="chevron" />
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-4);
	}

	.filter-row {
		margin-bottom: var(--space-4);
	}

	.filter-toggle {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		font-size: 0.875rem;
		color: var(--color-text-muted);
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.filter-toggle:active,
	.filter-toggle.active {
		background: var(--color-surface-solid);
		color: var(--color-text);
	}

	.habits-list {
		display: flex;
		flex-direction: column;
	}

	.habit-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-4);
		background: var(--color-surface-solid);
		text-decoration: none;
		color: inherit;
		margin-bottom: 1px;
		transition: background var(--transition-tap);
	}

	.habit-row:first-child {
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
	}

	.habit-row:last-child {
		border-radius: 0 0 var(--radius-lg) var(--radius-lg);
		margin-bottom: 0;
	}

	.habit-row:only-child {
		border-radius: var(--radius-lg);
	}

	.habit-row:active {
		background: var(--color-surface-active);
	}

	.habit-row.archived {
		opacity: 0.5;
	}

	.habit-content {
		flex: 1;
		min-width: 0;
	}

	.habit-name {
		display: block;
		font-size: 1.0625rem;
		font-weight: 600;
		margin-bottom: 4px;
	}

	.habit-stats {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.stat-item {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.875rem;
		color: var(--color-warning);
	}

	.stat-item.best {
		color: var(--color-accent);
	}

	.habit-row :global(.chevron) {
		color: var(--color-text-muted);
	}

	.skeleton-row {
		cursor: default;
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: var(--space-12) var(--space-4);
	}

	.empty-icon {
		font-size: 4rem;
		display: block;
		margin-bottom: var(--space-4);
	}

	.empty-state h3 {
		font-size: 1.25rem;
		margin-bottom: var(--space-2);
	}

	.empty-state p {
		color: var(--color-text-muted);
		margin-bottom: var(--space-6);
	}
</style>
