<!--
	Goals List Page - Enhanced with Sparklines & Actions
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { getActiveGoals, getGoalHabits, updateGoal, updateGoalStatus } from '$lib/db/goals';
	import { getHabit } from '$lib/db/habits';
	import { getAllCheckInsForHabit } from '$lib/db/checkins';
	import type { Goal, Habit } from '$lib/db/schema';
	import { Plus, Target, Clock, AlertCircle, CheckCircle, TrendingUp, TrendingDown, Minus, Check, Calendar } from 'lucide-svelte';

	interface GoalWithProgress extends Goal {
		linkedHabits: string[];
		progress: number;
		daysRemaining: number;
		trend: number[]; // Last 7 days progress for sparkline
	}

	let goals = $state<GoalWithProgress[]>([]);
	let loading = $state(true);

	// Overall status calculation
	function getOverallStatus(): { label: string; color: string; icon: any } {
		if (goals.length === 0) return { label: 'No Goals', color: 'var(--color-text-muted)', icon: Target };
		
		const avgProgress = goals.reduce((sum, g) => sum + g.progress, 0) / goals.length;
		const overdueCount = goals.filter(g => g.daysRemaining < 0).length;
		const onTrackCount = goals.filter(g => g.progress >= 0.7 && g.daysRemaining >= 0).length;
		
		if (overdueCount > goals.length / 2) {
			return { label: 'Needs Attention', color: 'var(--color-error)', icon: AlertCircle };
		}
		if (avgProgress >= 0.7 && overdueCount === 0) {
			return { label: 'On Track', color: 'var(--color-success)', icon: TrendingUp };
		}
		if (avgProgress >= 0.4) {
			return { label: 'Making Progress', color: 'var(--color-warning)', icon: Minus };
		}
		return { label: 'Losing Momentum', color: 'var(--color-warning)', icon: TrendingDown };
	}

	async function loadGoals() {
		loading = true;
		const activeGoals = await getActiveGoals();
		const goalsWithProgress: GoalWithProgress[] = [];

		for (const goal of activeGoals) {
			const deadline = new Date(goal.deadline);
			const today = new Date();
			const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

			const goalHabits = await getGoalHabits(goal.id);
			const linkedHabits: string[] = [];
			let totalProgress = 0;
			const dailyTrend: number[] = [];

			// Calculate last 7 days trend
			for (let d = 6; d >= 0; d--) {
				const date = new Date();
				date.setDate(date.getDate() - d);
				const dateStr = date.toISOString().split('T')[0];
				let dayProgress = 0;

				for (const gh of goalHabits) {
					const habit = await getHabit(gh.habitId);
					if (habit) {
						if (d === 6) linkedHabits.push(habit.name);
						
						const checkIns = await getAllCheckInsForHabit(habit.id);
						const hasCheckIn = checkIns.some(c => c.effectiveDate === dateStr);
						dayProgress += hasCheckIn ? gh.weight : 0;
					}
				}
				dailyTrend.push(dayProgress);
			}

			// Calculate overall progress
			for (const gh of goalHabits) {
				const habit = await getHabit(gh.habitId);
				if (habit) {
					const checkIns = await getAllCheckInsForHabit(habit.id);
					const goalStart = new Date(goal.createdAt);
					const relevantCheckIns = checkIns.filter(c => new Date(c.effectiveDate) >= goalStart);
					const totalDays = Math.max(1, Math.ceil((today.getTime() - goalStart.getTime()) / (1000 * 60 * 60 * 24)));
					const completedDays = new Set(relevantCheckIns.map(c => c.effectiveDate)).size;
					totalProgress += (completedDays / totalDays) * gh.weight;
				}
			}

			const progress = goalHabits.length > 0 ? Math.min(1, totalProgress) : 0;
			goalsWithProgress.push({ ...goal, linkedHabits, progress, daysRemaining, trend: dailyTrend });
		}

		goals = goalsWithProgress;
		loading = false;
	}

	onMount(() => {
		loadGoals();
	});

	async function markAchieved(goalId: string, e: Event) {
		e.preventDefault();
		e.stopPropagation();
		await updateGoalStatus(goalId, 'achieved');
		goals = goals.filter(g => g.id !== goalId);
	}

	async function extendGoal(goalId: string, days: number, e: Event) {
		e.preventDefault();
		e.stopPropagation();
		const goal = goals.find(g => g.id === goalId);
		if (!goal) return;
		
		const newDeadline = new Date(goal.deadline);
		newDeadline.setDate(newDeadline.getDate() + days);
		await updateGoal(goalId, { deadline: newDeadline.toISOString().split('T')[0] });
		
		// Refresh
		loadGoals();
	}

	function getStatusColor(progress: number, daysRemaining: number): string {
		if (daysRemaining < 0) return 'var(--color-error)';
		if (progress >= 0.8) return 'var(--color-success)';
		if (progress >= 0.5) return 'var(--color-warning)';
		return 'var(--color-text-muted)';
	}

	// Generate sparkline path
	function getSparklinePath(trend: number[]): string {
		const max = Math.max(...trend, 0.1);
		const points = trend.map((v, i) => {
			const x = (i / (trend.length - 1)) * 60;
			const y = 20 - (v / max) * 16;
			return `${x},${y}`;
		});
		return `M ${points.join(' L ')}`;
	}
</script>

<div class="container">
	<header class="page-header animate-fade-in">
		<h1>Goals</h1>
		<a href="/goals/new" class="btn btn-primary">
			<Plus size={18} />
			New
		</a>
	</header>

	{#if loading}
		<div class="goal-list">
			{#each [1, 2] as _}
				<div class="goal-card skeleton-card">
					<div class="skeleton" style="height: 24px; width: 70%; margin-bottom: 8px;"></div>
					<div class="skeleton" style="height: 16px; width: 40%; margin-bottom: 16px;"></div>
					<div class="skeleton" style="height: 8px; width: 100%;"></div>
				</div>
			{/each}
		</div>
	{:else if goals.length === 0}
		<div class="empty-state animate-fade-in">
			<div class="empty-icon">🎯</div>
			<h3>No active goals</h3>
			<p>Set a goal to stay focused</p>
			<a href="/goals/new" class="btn btn-primary mt-4">
				<Plus size={18} />
				Create Goal
			</a>
		</div>
	{:else}
		<!-- Overall Status -->
		{@const status = getOverallStatus()}
		<div class="overall-status animate-fade-in" style="border-color: {status.color}">
			<div class="status-icon" style="color: {status.color}">
				<svelte:component this={status.icon} size={24} />
			</div>
			<div class="status-content">
				<span class="status-label" style="color: {status.color}">{status.label}</span>
				<span class="status-detail">{goals.length} active goal{goals.length !== 1 ? 's' : ''}</span>
			</div>
		</div>

		<ul class="goal-list">
			{#each goals as goal, i (goal.id)}
				<li class="animate-slide-up" style="animation-delay: {i * 50}ms">
					<a href="/goals/{goal.id}" class="goal-card">
						<div class="goal-header">
							<div class="goal-info">
								<h3 class="goal-name">{goal.name}</h3>
								{#if goal.linkedHabits.length > 0}
									<div class="goal-habits">
										<Target size={12} />
										<span>
											{#if goal.linkedHabits.length === 1}
												{goal.linkedHabits[0]}
											{:else if goal.linkedHabits.length === 2}
												{goal.linkedHabits[0]} & {goal.linkedHabits[1]}
											{:else}
												{goal.linkedHabits[0]} +{goal.linkedHabits.length - 1} more
											{/if}
										</span>
									</div>
								{/if}
							</div>

							<!-- Sparkline -->
							<div class="sparkline-wrap">
								<svg class="sparkline" viewBox="0 0 60 24" preserveAspectRatio="none">
									<path
										d={getSparklinePath(goal.trend)}
										fill="none"
										stroke={getStatusColor(goal.progress, goal.daysRemaining)}
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
							</div>
						</div>

						<div class="progress-section">
							<div class="progress-track">
								<div 
									class="progress-fill" 
									style="width: {goal.progress * 100}%; background: {getStatusColor(goal.progress, goal.daysRemaining)}"
								></div>
							</div>
							<span class="progress-text">{(goal.progress * 100).toFixed(0)}%</span>
							<span 
								class="goal-deadline"
								class:overdue={goal.daysRemaining < 0}
								class:urgent={goal.daysRemaining >= 0 && goal.daysRemaining <= 7}
							>
								{#if goal.daysRemaining < 0}
									{Math.abs(goal.daysRemaining)}d over
								{:else if goal.daysRemaining === 0}
									Today
								{:else}
									{goal.daysRemaining}d
								{/if}
							</span>
						</div>

						<!-- Overdue Actions -->
						{#if goal.daysRemaining < 0}
							<div class="overdue-actions">
								<button class="action-btn achieved" onclick={(e) => markAchieved(goal.id, e)}>
									<Check size={16} />
									Achieved
								</button>
								<button class="action-btn extend" onclick={(e) => extendGoal(goal.id, 7, e)}>
									<Calendar size={16} />
									+7 days
								</button>
								<button class="action-btn extend" onclick={(e) => extendGoal(goal.id, 14, e)}>
									+14d
								</button>
							</div>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	/* Overall Status Banner */
	.overall-status {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4);
		background: var(--color-surface-solid);
		border-radius: var(--radius-lg);
		border-left: 4px solid;
		margin-bottom: var(--space-6);
	}

	.status-icon {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface-hover);
		border-radius: 50%;
	}

	.status-content {
		display: flex;
		flex-direction: column;
	}

	.status-label {
		font-size: 1.125rem;
		font-weight: 700;
	}

	.status-detail {
		font-size: 0.875rem;
		color: var(--color-text-muted);
	}

	/* Goal List */
	.goal-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.goal-card {
		display: block;
		background: var(--color-surface-solid);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		color: inherit;
		text-decoration: none;
		transition: background var(--transition-tap);
	}

	.goal-card:active {
		background: var(--color-surface-active);
	}

	.goal-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-3);
		margin-bottom: var(--space-3);
	}

	.goal-info {
		flex: 1;
		min-width: 0;
	}

	.goal-name {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: var(--space-1);
	}

	.goal-habits {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	/* Sparkline */
	.sparkline-wrap {
		width: 60px;
		height: 24px;
		flex-shrink: 0;
	}

	.sparkline {
		width: 100%;
		height: 100%;
	}

	/* Progress */
	.progress-section {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.progress-track {
		flex: 1;
		height: 6px;
		background: var(--color-bg);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		border-radius: var(--radius-full);
		transition: width var(--transition-slow);
	}

	.progress-text {
		font-size: 0.8125rem;
		font-weight: 600;
		min-width: 32px;
	}

	.goal-deadline {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--color-text-muted);
		padding: var(--space-1) var(--space-2);
		background: var(--color-surface-hover);
		border-radius: var(--radius-sm);
	}

	.goal-deadline.overdue {
		color: var(--color-error);
		background: rgba(248, 113, 113, 0.1);
	}

	.goal-deadline.urgent {
		color: var(--color-warning);
		background: rgba(251, 191, 36, 0.1);
	}

	/* Overdue Actions */
	.overdue-actions {
		display: flex;
		gap: var(--space-2);
		margin-top: var(--space-3);
		padding-top: var(--space-3);
		border-top: 1px solid var(--color-border);
	}

	.action-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-1);
		padding: var(--space-2) var(--space-3);
		font-size: 0.8125rem;
		font-weight: 600;
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--transition-tap);
	}

	.action-btn.achieved {
		background: var(--color-success-soft);
		color: var(--color-success);
	}

	.action-btn.extend {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}

	.action-btn:active {
		transform: scale(0.97);
		opacity: 0.8;
	}

	/* Skeleton */
	.skeleton-card {
		padding: var(--space-4);
	}

	/* Empty state */
	.empty-state {
		text-align: center;
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

	.empty-state p {
		color: var(--color-text-muted);
		margin-bottom: var(--space-4);
	}
</style>
