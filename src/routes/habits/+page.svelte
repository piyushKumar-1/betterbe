<!--
	Habits List Page - Modern Design
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { getAllHabits } from '$lib/db/habits';
	import { calculateMomentum, getMomentumArrow } from '$lib/analytics/momentum';
	import { calculateStreaks } from '$lib/analytics/streaks';
	import type { Habit } from '$lib/db/schema';
	import type { MomentumData } from '$lib/analytics/momentum';
	import type { StreakData } from '$lib/analytics/streaks';
	import { Plus, TrendingUp, TrendingDown, Minus, Flame, Trophy, Archive, Eye, EyeOff } from 'lucide-svelte';

	let habits = $state<Habit[]>([]);
	let momentum = $state<Map<string, MomentumData>>(new Map());
	let streaks = $state<Map<string, StreakData>>(new Map());
	let loading = $state(true);
	let showArchived = $state(false);

	async function loadHabits() {
		loading = true;
		const allHabits = await getAllHabits();
		habits = allHabits;

		const momentumMap = new Map<string, MomentumData>();
		const streakMap = new Map<string, StreakData>();

		for (const habit of allHabits) {
			const m = await calculateMomentum(habit.id);
			const s = await calculateStreaks(habit.id);
			momentumMap.set(habit.id, m);
			streakMap.set(habit.id, s);
		}

		momentum = momentumMap;
		streaks = streakMap;
		loading = false;
	}

	onMount(() => {
		loadHabits();
	});

	function getDisplayedHabits(): Habit[] {
		if (showArchived) return habits;
		return habits.filter(h => !h.archived);
	}

	function getHabitTypeLabel(type: string): string {
		switch (type) {
			case 'binary': return 'Yes/No';
			case 'numeric': return 'Count';
			case 'duration': return 'Duration';
			case 'scale': return 'Scale';
			default: return type;
		}
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
	<header class="page-header animate-fade-in">
		<h1>Habits</h1>
		<a href="/habits/new" class="btn btn-primary">
			<Plus size={18} />
			New
		</a>
	</header>

	<div class="filters animate-fade-in">
		<button 
			class="filter-btn"
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
		<div class="habit-grid">
			{#each [1, 2, 3] as _}
				<div class="habit-card skeleton-card">
					<div class="skeleton" style="height: 24px; width: 70%; margin-bottom: 8px;"></div>
					<div class="skeleton" style="height: 16px; width: 40%; margin-bottom: 16px;"></div>
					<div class="skeleton" style="height: 48px; width: 100%;"></div>
				</div>
			{/each}
		</div>
	{:else if getDisplayedHabits().length === 0}
		<div class="empty-state animate-fade-in">
			<div class="empty-icon">📊</div>
			<h3>No habits yet</h3>
			<p>Create habits to start tracking</p>
			<a href="/habits/new" class="btn btn-primary mt-4">
				<Plus size={18} />
				Create Habit
			</a>
		</div>
	{:else}
		<ul class="habit-grid">
			{#each getDisplayedHabits() as habit, i (habit.id)}
				{@const m = momentum.get(habit.id)}
				{@const s = streaks.get(habit.id)}

				<li class="habit-card animate-slide-up" class:archived={habit.archived} style="animation-delay: {i * 50}ms">
					<a href="/habits/{habit.id}" class="habit-link">
						<div class="habit-header">
							<h3 class="habit-name">{habit.name}</h3>
							{#if m}
								<div class="momentum-indicator" style="color: {getMomentumColor(m.direction)}">
									<svelte:component this={getMomentumIcon(m.direction)} size={18} />
								</div>
							{/if}
						</div>

						<div class="habit-meta">
							<span class="habit-type-badge">{getHabitTypeLabel(habit.type)}</span>
							{#if habit.targetValue && habit.unit}
								<span>· {habit.targetValue} {habit.unit}</span>
							{/if}
						</div>

						{#if s}
							<div class="streak-row">
								<div class="streak-item">
									<Flame size={16} class="streak-icon current" />
									<span class="streak-value">{s.currentStreak}</span>
									<span class="streak-label">current</span>
								</div>
								<div class="streak-item">
									<Trophy size={16} class="streak-icon best" />
									<span class="streak-value">{s.longestStreak}</span>
									<span class="streak-label">best</span>
								</div>
							</div>
						{/if}

						{#if habit.archived}
							<div class="archived-badge">
								<Archive size={12} />
								Archived
							</div>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.filters {
		margin-bottom: var(--space-4);
	}

	.filter-btn {
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

	.filter-btn:hover,
	.filter-btn.active {
		color: var(--color-text);
		border-color: var(--color-border-hover);
		background: var(--color-surface);
	}

	.habit-grid {
		list-style: none;
		display: grid;
		gap: var(--space-4);
	}

	.habit-card {
		background: var(--color-surface);
		backdrop-filter: blur(20px);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		transition: all var(--transition-normal);
		overflow: hidden;
	}

	.habit-card:hover {
		border-color: var(--color-border-hover);
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.habit-card.archived {
		opacity: 0.5;
	}

	.habit-link {
		display: block;
		padding: var(--space-4);
		color: inherit;
		text-decoration: none;
	}

	.habit-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-2);
	}

	.habit-name {
		font-size: 1rem;
		font-weight: 600;
	}

	.momentum-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--color-surface-hover);
	}

	.habit-meta {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		margin-bottom: var(--space-4);
	}

	.habit-type-badge {
		padding: var(--space-1) var(--space-2);
		background: var(--color-surface-hover);
		border-radius: var(--radius-sm);
	}

	.streak-row {
		display: flex;
		gap: var(--space-6);
		padding-top: var(--space-3);
		border-top: 1px solid var(--color-border);
	}

	.streak-item {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.streak-item :global(.streak-icon.current) {
		color: var(--color-warning);
	}

	.streak-item :global(.streak-icon.best) {
		color: var(--color-accent);
	}

	.streak-value {
		font-size: 1.125rem;
		font-weight: 700;
	}

	.streak-label {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.archived-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		margin-top: var(--space-3);
		padding: var(--space-1) var(--space-2);
		font-size: 0.75rem;
		color: var(--color-text-muted);
		background: var(--color-surface-hover);
		border-radius: var(--radius-sm);
	}

	/* Skeleton */
	.skeleton-card {
		padding: var(--space-4);
	}

	/* Empty state */
	.empty-state {
		padding: var(--space-10) var(--space-4);
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: var(--space-4);
	}

	.empty-state h3 {
		font-size: 1.25rem;
		margin-bottom: var(--space-2);
	}
</style>
