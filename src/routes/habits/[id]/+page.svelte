<!--
	Habit Detail Page - Modern Design
-->
<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getHabit, archiveHabit, updateHabit } from '$lib/db/habits';
	import { generateHeatmapData } from '$lib/analytics/heatmap';
	import { calculateRollingAverages } from '$lib/analytics/rolling-average';
	import { calculateMomentum, getMomentumArrow } from '$lib/analytics/momentum';
	import { calculateStreaks } from '$lib/analytics/streaks';
	import type { Habit } from '$lib/db/schema';
	import type { HeatmapData } from '$lib/analytics/heatmap';
	import type { RollingAverageData } from '$lib/analytics/rolling-average';
	import type { MomentumData } from '$lib/analytics/momentum';
	import type { StreakData } from '$lib/analytics/streaks';
	import { ArrowLeft, MoreVertical, TrendingUp, TrendingDown, Minus, Flame, Trophy, Target, Archive, RotateCcw } from 'lucide-svelte';

	let habit = $state<Habit | null>(null);
	let heatmapData = $state<HeatmapData | null>(null);
	let averagesData = $state<RollingAverageData | null>(null);
	let momentumData = $state<MomentumData | null>(null);
	let streakData = $state<StreakData | null>(null);
	let loading = $state(true);
	let showActions = $state(false);

	async function loadHabit() {
		const id = $page.params.id;
		if (!id) {
			goto('/habits');
			return;
		}

		loading = true;
		
		const h = await getHabit(id);
		if (!h) {
			goto('/habits');
			return;
		}

		habit = h;

		const [heatmap, averages, momentum, streaks] = await Promise.all([
			generateHeatmapData(id, 365),
			calculateRollingAverages(id, 90),
			calculateMomentum(id),
			calculateStreaks(id)
		]);

		heatmapData = heatmap;
		averagesData = averages;
		momentumData = momentum;
		streakData = streaks;

		loading = false;
	}

	onMount(() => {
		loadHabit();
	});

	async function handleArchive() {
		if (!habit) return;
		await archiveHabit(habit.id);
		goto('/habits');
	}

	async function handleUnarchive() {
		if (!habit) return;
		await updateHabit(habit.id, { archived: false });
		habit = { ...habit, archived: false };
		showActions = false;
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
	{#if loading}
		<div class="loading-state">
			<div class="skeleton" style="height: 32px; width: 60%; margin-bottom: 16px;"></div>
			<div class="skeleton" style="height: 120px; width: 100%; margin-bottom: 16px;"></div>
			<div class="skeleton" style="height: 200px; width: 100%;"></div>
		</div>
	{:else if habit}
		<header class="page-header animate-fade-in">
			<a href="/habits" class="btn btn-icon btn-ghost">
				<ArrowLeft size={20} />
			</a>
			<div style="flex: 1"></div>
			<button class="btn btn-icon btn-ghost" onclick={() => showActions = !showActions}>
				<MoreVertical size={20} />
			</button>
		</header>

		<!-- Hero section -->
		<div class="hero animate-slide-up">
			<h1 class="habit-title">{habit.name}</h1>
			{#if momentumData}
				<div class="momentum-display" style="color: {getMomentumColor(momentumData.direction)}">
					<svelte:component this={getMomentumIcon(momentumData.direction)} size={20} />
					<span>{momentumData.direction}</span>
				</div>
			{/if}
			{#if habit.description}
				<p class="habit-description">{habit.description}</p>
			{/if}
		</div>

		<!-- Stats Grid -->
		<div class="stats-grid animate-slide-up" style="animation-delay: 100ms">
			{#if streakData}
				<div class="stat-card">
					<div class="stat-icon" style="color: var(--color-warning)">
						<Flame size={20} />
					</div>
					<span class="stat-value">{streakData.currentStreak}</span>
					<span class="stat-label">Current Streak</span>
				</div>
				<div class="stat-card">
					<div class="stat-icon" style="color: var(--color-accent)">
						<Trophy size={20} />
					</div>
					<span class="stat-value">{streakData.longestStreak}</span>
					<span class="stat-label">Best Streak</span>
				</div>
			{/if}
			{#if heatmapData}
				<div class="stat-card">
					<div class="stat-icon" style="color: var(--color-primary)">
						<Target size={20} />
					</div>
					<span class="stat-value">{(heatmapData.completionRate * 100).toFixed(0)}%</span>
					<span class="stat-label">Completion</span>
				</div>
			{/if}
			{#if averagesData}
				<div class="stat-card">
					<div class="stat-icon" style="color: var(--color-success)">
						<TrendingUp size={20} />
					</div>
					<span class="stat-value">{(averagesData.current7 * 100).toFixed(0)}%</span>
					<span class="stat-label">7-Day Avg</span>
				</div>
			{/if}
		</div>

		<!-- Rolling Averages -->
		{#if averagesData}
			<section class="section animate-slide-up" style="animation-delay: 200ms">
				<h2 class="section-title">Rolling Averages</h2>
				<div class="averages-card">
					{#each [
						{ label: '7 days', value: averagesData.current7 },
						{ label: '14 days', value: averagesData.current14 },
						{ label: '30 days', value: averagesData.current30 }
					] as avg}
						<div class="average-row">
							<span class="average-label">{avg.label}</span>
							<div class="average-track">
								<div 
									class="average-fill" 
									style="width: {avg.value * 100}%"
								></div>
							</div>
							<span class="average-value">{(avg.value * 100).toFixed(0)}%</span>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Heatmap -->
		{#if heatmapData}
			<section class="section animate-slide-up" style="animation-delay: 300ms">
				<h2 class="section-title">Activity</h2>
				<div class="heatmap-card">
					<div class="heatmap-grid">
						{#each heatmapData.cells.slice(-364) as cell}
							<div 
								class="heatmap-cell intensity-{cell.intensity}"
								title="{cell.date}: {cell.value}"
							></div>
						{/each}
					</div>
					<div class="heatmap-legend">
						<span>Less</span>
						{#each [0, 1, 2, 3, 4] as i}
							<div class="heatmap-cell intensity-{i}"></div>
						{/each}
						<span>More</span>
					</div>
				</div>
			</section>
		{/if}

		<!-- Actions menu -->
		{#if showActions}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="actions-backdrop" onclick={() => showActions = false}>
				<div class="actions-menu animate-slide-up" onclick={(e) => e.stopPropagation()}>
					{#if habit.archived}
						<button class="action-item" onclick={handleUnarchive}>
							<RotateCcw size={18} />
							Restore Habit
						</button>
					{:else}
						<button class="action-item danger" onclick={handleArchive}>
							<Archive size={18} />
							Archive Habit
						</button>
					{/if}
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.loading-state {
		padding-top: var(--space-8);
	}

	.hero {
		text-align: center;
		margin-bottom: var(--space-6);
	}

	.habit-title {
		font-size: 1.75rem;
		font-weight: 700;
		margin-bottom: var(--space-2);
		background: linear-gradient(135deg, var(--color-text) 0%, var(--color-text-secondary) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.momentum-display {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-weight: 500;
		text-transform: capitalize;
		margin-bottom: var(--space-2);
	}

	.habit-description {
		color: var(--color-text-muted);
		max-width: 400px;
		margin: 0 auto;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-3);
		margin-bottom: var(--space-6);
	}

	.stat-card {
		background: var(--color-surface);
		backdrop-filter: blur(20px);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		text-align: center;
	}

	.stat-icon {
		margin-bottom: var(--space-2);
	}

	.stat-value {
		display: block;
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1.2;
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	/* Sections */
	.section {
		margin-bottom: var(--space-6);
	}

	.section-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-muted);
		margin-bottom: var(--space-3);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Averages */
	.averages-card {
		background: var(--color-surface);
		backdrop-filter: blur(20px);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
	}

	.average-row {
		display: grid;
		grid-template-columns: 60px 1fr 45px;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2) 0;
	}

	.average-row:not(:last-child) {
		border-bottom: 1px solid var(--color-border);
	}

	.average-label {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.average-track {
		height: 8px;
		background: var(--color-bg);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.average-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--color-primary) 0%, var(--color-accent) 100%);
		border-radius: var(--radius-full);
		transition: width var(--transition-slow);
	}

	.average-value {
		font-size: 0.875rem;
		font-weight: 600;
		text-align: right;
	}

	/* Heatmap */
	.heatmap-card {
		background: var(--color-surface);
		backdrop-filter: blur(20px);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		overflow-x: auto;
	}

	.heatmap-grid {
		display: grid;
		grid-template-columns: repeat(52, 1fr);
		grid-template-rows: repeat(7, 1fr);
		grid-auto-flow: column;
		gap: 3px;
		min-width: 600px;
		margin-bottom: var(--space-3);
	}

	.heatmap-cell {
		aspect-ratio: 1;
		border-radius: 2px;
		min-width: 10px;
	}

	.intensity-0 { background: var(--color-surface-hover); }
	.intensity-1 { background: rgba(255, 107, 107, 0.2); }
	.intensity-2 { background: rgba(255, 107, 107, 0.4); }
	.intensity-3 { background: rgba(255, 107, 107, 0.7); }
	.intensity-4 { background: var(--color-primary); }

	.heatmap-legend {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 4px;
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.heatmap-legend .heatmap-cell {
		width: 12px;
		height: 12px;
	}

	/* Actions */
	.actions-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 100;
	}

	.actions-menu {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: var(--color-surface-solid);
		border-top: 1px solid var(--color-border);
		border-radius: var(--radius-xl) var(--radius-xl) 0 0;
		padding: var(--space-4);
		padding-bottom: max(var(--space-4), env(safe-area-inset-bottom));
	}

	.action-item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-4);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text);
		font: inherit;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.action-item:hover {
		background: var(--color-surface-hover);
	}

	.action-item.danger {
		color: var(--color-error);
	}
</style>
