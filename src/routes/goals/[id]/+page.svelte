<!--
	Goal Detail Page
-->
<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { getGoal, getGoalHabits, deleteGoal } from '$lib/data/goals';
	import { getHabit } from '$lib/data/habits';
	import { getAllCheckInsForHabit } from '$lib/data/checkins';
	import { generateHeatmapData, type HeatmapData, type HeatmapCell } from '$lib/analytics/heatmap';
	import type { Goal, Habit } from '$lib/db/schema';
	import { ArrowLeft, Target, Calendar, Trash2, ChevronRight, AlertCircle, CheckCircle, Clock } from 'lucide-svelte';

	interface HabitWithChart extends Habit {
		chartData: HeatmapCell[];
		maxValue: number;
	}

	let goal = $state<Goal | null>(null);
	let linkedHabits = $state<HabitWithChart[]>([]);
	let progress = $state(0);
	let daysRemaining = $state(0);
	let loading = $state(true);
	let showDelete = $state(false);

	async function loadGoal() {
		const id = $page.params.id;
		if (!id) {
			goto(`${base}/goals`);
			return;
		}

		loading = true;

		const g = await getGoal(id);
		if (!g) {
			goto(`${base}/goals`);
			return;
		}

		goal = g;

		// Calculate days remaining
		const deadline = new Date(g.deadline);
		const today = new Date();
		daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

		// Load linked habits with chart data
		const goalHabits = await getGoalHabits(id);
		const habits: HabitWithChart[] = [];
		let totalProgress = 0;
		
		// Calculate goal duration for progress
		const goalStart = new Date(g.createdAt);
		const goalDuration = Math.max(1, Math.ceil((deadline.getTime() - goalStart.getTime()) / (1000 * 60 * 60 * 24)));

		for (const gh of goalHabits) {
			const habit = await getHabit(gh.habitId);
			if (habit) {
				// Get last 30 days of chart data
				const heatmap = await generateHeatmapData(habit.id, 30);
				const chartData = heatmap.cells;
				const maxValue = Math.max(...chartData.map(c => c.value), 1);
				
				habits.push({
					...habit,
					chartData,
					maxValue
				});

				// Calculate progress based on total goal duration
				const checkIns = await getAllCheckInsForHabit(habit.id);
				const relevantCheckIns = checkIns.filter(c => new Date(c.effectiveDate) >= goalStart);
				const completedDays = new Set(relevantCheckIns.map(c => c.effectiveDate)).size;
				totalProgress += (completedDays / goalDuration) * gh.weight;
			}
		}

		linkedHabits = habits;
		// Normalize by total weight
		const totalWeight = goalHabits.reduce((sum, gh) => sum + gh.weight, 0);
		progress = goalHabits.length > 0 ? Math.min(1, totalProgress / Math.max(1, totalWeight)) : 0;

		loading = false;
	}

	onMount(() => {
		loadGoal();
	});

	async function handleDelete() {
		if (!goal) return;
		await deleteGoal(goal.id);
		goto(`${base}/goals`);
	}

	function getStatusColor(): string {
		if (daysRemaining < 0) return 'var(--color-error)';
		if (progress >= 0.8) return 'var(--color-success)';
		if (progress >= 0.5) return 'var(--color-warning)';
		return 'var(--color-text-muted)';
	}
</script>

<div class="container">
	{#if loading}
		<div class="loading-state">
			<div class="skeleton" style="height: 32px; width: 60%; margin-bottom: 16px;"></div>
			<div class="skeleton" style="height: 120px; width: 100%;"></div>
		</div>
	{:else if goal}
		<header class="header">
			<a href="{base}/goals" class="btn btn-icon btn-ghost">
				<ArrowLeft size={20} />
			</a>
			<div style="flex: 1"></div>
			<a href="{base}/goals/{goal.id}/edit" class="btn btn-icon btn-ghost">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
			</a>
			<button class="btn btn-icon btn-ghost" onclick={() => showDelete = true}>
				<Trash2 size={20} />
			</button>
		</header>

		<!-- Goal Info -->
		<div class="goal-hero animate-slide-up">
			<h1>{goal.name}</h1>
			{#if goal.description}
				<p class="goal-description">{goal.description}</p>
			{/if}
		</div>

		<!-- Progress Card -->
		<div class="progress-card animate-slide-up" style="animation-delay: 50ms">
			<div class="progress-header">
				<span class="progress-label">Progress</span>
				<span class="progress-value" style="color: {getStatusColor()}">{(progress * 100).toFixed(0)}%</span>
			</div>
			<div class="progress-track">
				<div 
					class="progress-fill" 
					style="width: {progress * 100}%; background: {getStatusColor()}"
				></div>
			</div>
		</div>

		<!-- Stats -->
		<div class="stats-row animate-slide-up" style="animation-delay: 100ms">
			<div class="stat-card">
				<Calendar size={20} />
				<div class="stat-content">
					<span class="stat-value" class:overdue={daysRemaining < 0}>
						{#if daysRemaining < 0}
							{Math.abs(daysRemaining)}d overdue
						{:else if daysRemaining === 0}
							Due today
						{:else}
							{daysRemaining} days left
						{/if}
					</span>
					<span class="stat-label">Deadline: {new Date(goal.deadline).toLocaleDateString()}</span>
				</div>
			</div>
		</div>

		<!-- Linked Habits with Charts -->
		{#if linkedHabits.length > 0}
			<div class="section animate-slide-up" style="animation-delay: 150ms">
				<div class="section-header">Habit Progress (Last 30 Days)</div>
				<div class="habits-chart-grid" class:single={linkedHabits.length === 1}>
					{#each linkedHabits as habit, i}
						{@const completedCount = habit.chartData.filter(c => c.completed).length}
						{@const todayValue = habit.chartData[habit.chartData.length - 1]?.value ?? 0}
						{@const chartWidth = habit.chartData.length * 28}
						<div class="habit-chart-card" style="animation-delay: {150 + i * 50}ms">
							<a href="{base}/habits/{habit.id}" class="habit-chart-header">
								<span class="habit-chart-name">{habit.name}</span>
								<div class="header-right">
									<span class="stat-pill">{completedCount}/30</span>
									<ChevronRight size={16} class="chevron" />
								</div>
							</a>
							
							<!-- Scrollable Line Chart -->
							<div class="chart-scroll-container hide-scrollbar">
								<div class="chart-inner" style="width: {chartWidth}px">
									<svg class="chart-svg" viewBox="0 0 {chartWidth} 60" preserveAspectRatio="none">
										<!-- Grid lines -->
										{#each [0.5] as frac}
											<line 
												x1="0" y1={50 - frac * 40} 
												x2={chartWidth} y2={50 - frac * 40}
												stroke="var(--color-border)" stroke-dasharray="2,2" stroke-width="1"
											/>
										{/each}
										<!-- Line path -->
										<path
											d="M {habit.chartData.map((c, idx) => `${idx * 28 + 14},${50 - (c.value / habit.maxValue) * 40}`).join(' L ')}"
											fill="none"
											stroke="var(--color-primary)"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
										<!-- Data points -->
										{#each habit.chartData as cell, idx}
											{@const y = 50 - (cell.value / habit.maxValue) * 40}
											<circle 
												cx={idx * 28 + 14} cy={y} r="3"
												fill={cell.value > 0 ? "var(--color-primary)" : "var(--color-surface-hover)"}
												stroke={cell.value > 0 ? "var(--color-primary)" : "var(--color-border)"}
												stroke-width="1"
											/>
										{/each}
									</svg>
									<!-- X-axis labels -->
									<div class="chart-labels">
										{#each habit.chartData as cell, idx}
											{@const date = new Date(cell.date)}
											{@const isToday = cell.date === new Date().toISOString().split('T')[0]}
											<div class="chart-label" class:today={isToday} style="left: {idx * 28 + 14}px">
												<span class="label-day">{date.getDate()}</span>
											</div>
										{/each}
									</div>
								</div>
							</div>
							
							{#if todayValue > 0}
								<div class="today-badge">Today: {todayValue}</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="section animate-slide-up" style="animation-delay: 150ms">
				<div class="empty-habits">
					<p>No habits linked to this goal</p>
				</div>
			</div>
		{/if}

		<!-- Delete Confirmation -->
		{#if showDelete}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="sheet-backdrop" onclick={() => showDelete = false}>
				<div class="sheet animate-slide-up" onclick={(e) => e.stopPropagation()}>
					<div class="pull-indicator"></div>
					<div class="sheet-content">
						<AlertCircle size={48} style="color: var(--color-error); margin-bottom: var(--space-4);" />
						<h3>Delete Goal?</h3>
						<p>This action cannot be undone.</p>
					</div>
					<div class="sheet-actions">
						<button class="btn btn-secondary" onclick={() => showDelete = false}>Cancel</button>
						<button class="btn btn-danger" onclick={handleDelete}>Delete</button>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.header {
		display: flex;
		align-items: center;
		margin-bottom: var(--space-4);
	}

	.loading-state {
		padding-top: var(--space-8);
	}

	.goal-hero {
		margin-bottom: var(--space-6);
	}

	.goal-hero h1 {
		margin-bottom: var(--space-2);
	}

	.goal-description {
		color: var(--color-text-muted);
	}

	/* Progress Card */
	.progress-card {
		background: var(--color-surface-solid);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		margin-bottom: var(--space-4);
	}

	.progress-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-3);
	}

	.progress-label {
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.progress-value {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.progress-track {
		height: 10px;
		background: var(--color-bg);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		border-radius: var(--radius-full);
		transition: width var(--transition-slow);
	}

	/* Stats */
	.stats-row {
		margin-bottom: var(--space-6);
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		background: var(--color-surface-solid);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		color: var(--color-text-secondary);
	}

	.stat-content {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-weight: 600;
		color: var(--color-text);
	}

	.stat-value.overdue {
		color: var(--color-error);
	}

	.stat-label {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
	}

	/* Sections */
	.section {
		margin-bottom: var(--space-6);
	}

	.section-header {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: var(--space-2) 0;
		margin-bottom: var(--space-2);
	}

	/* Habits Chart Grid - 2 per row */
	.habits-chart-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-3);
	}

	.habits-chart-grid.single {
		grid-template-columns: 1fr;
	}

	.habit-chart-card {
		display: flex;
		flex-direction: column;
		background: var(--color-surface-solid);
		border-radius: var(--radius-lg);
		padding: var(--space-3);
		animation: slideUp var(--transition-normal) ease-out both;
		overflow: hidden;
	}

	.habit-chart-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
		color: inherit;
		text-decoration: none;
		transition: opacity var(--transition-tap);
	}

	.habit-chart-header:active {
		opacity: 0.6;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.habit-chart-name {
		font-weight: 600;
		font-size: 0.8125rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex: 1;
		min-width: 0;
	}

	.habit-chart-card :global(.chevron) {
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	/* Scrollable Chart */
	.chart-scroll-container {
		overflow-x: auto;
		overflow-y: hidden;
		margin: 0 calc(var(--space-3) * -1);
		padding: 0 var(--space-3);
		direction: rtl; /* Start scrolled to the right (today) */
	}

	.chart-inner {
		direction: ltr;
		position: relative;
		height: 80px;
		min-width: 100%;
	}

	.chart-svg {
		width: 100%;
		height: 60px;
		display: block;
	}

	.chart-labels {
		position: relative;
		height: 20px;
	}

	.chart-label {
		position: absolute;
		transform: translateX(-50%);
		text-align: center;
	}

	.label-day {
		font-size: 0.625rem;
		color: var(--color-text-muted);
	}

	.chart-label.today .label-day {
		color: var(--color-primary);
		font-weight: 600;
	}

	/* Stats */
	.stat-pill {
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 2px 6px;
		background: var(--color-surface-hover);
		border-radius: var(--radius-sm);
		color: var(--color-text-secondary);
		white-space: nowrap;
	}

	.today-badge {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--color-primary);
		text-align: right;
		margin-top: var(--space-1);
	}

	.empty-habits {
		text-align: center;
		padding: var(--space-6);
		color: var(--color-text-muted);
		background: var(--color-surface-solid);
		border-radius: var(--radius-lg);
	}

	/* Hide scrollbar but keep functionality */
	.hide-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}

	.hide-scrollbar::-webkit-scrollbar {
		display: none;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Sheet */
	.sheet-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		z-index: 2000;
		display: flex;
		align-items: flex-end;
	}

	.sheet {
		width: 100%;
		background: var(--color-surface-solid);
		border-radius: var(--radius-xl) var(--radius-xl) 0 0;
		padding: var(--space-2) var(--space-4) var(--space-4);
		padding-bottom: calc(var(--space-4) + var(--safe-bottom));
	}

	.sheet-content {
		text-align: center;
		padding: var(--space-4);
	}

	.sheet-content h3 {
		margin-bottom: var(--space-2);
	}

	.sheet-content p {
		color: var(--color-text-muted);
	}

	.sheet-actions {
		display: flex;
		gap: var(--space-3);
	}

	.sheet-actions .btn {
		flex: 1;
	}

	.btn-danger {
		background: var(--color-error);
		color: white;
	}

	.pull-indicator {
		width: 36px;
		height: 5px;
		background: var(--color-border);
		border-radius: var(--radius-full);
		margin: var(--space-2) auto var(--space-4);
	}
</style>
