<!--
	Goals List Page - Multi-Habit Support
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { getActiveGoals, getGoalHabits } from '$lib/db/goals';
	import { getHabit } from '$lib/db/habits';
	import { getAllCheckInsForHabit } from '$lib/db/checkins';
	import type { Goal, Habit } from '$lib/db/schema';
	import { Plus, Target, Clock, AlertCircle, CheckCircle } from 'lucide-svelte';

	interface GoalWithProgress extends Goal {
		linkedHabits: string[];
		progress: number;
		daysRemaining: number;
	}

	let goals = $state<GoalWithProgress[]>([]);
	let loading = $state(true);

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

			for (const gh of goalHabits) {
				const habit = await getHabit(gh.habitId);
				if (habit) {
					linkedHabits.push(habit.name);

					// Calculate progress for this habit
					const checkIns = await getAllCheckInsForHabit(habit.id);
					const goalStart = new Date(goal.createdAt);
					const relevantCheckIns = checkIns.filter(c => new Date(c.effectiveDate) >= goalStart);
					const totalDays = Math.max(1, Math.ceil((today.getTime() - goalStart.getTime()) / (1000 * 60 * 60 * 24)));
					const completedDays = new Set(relevantCheckIns.map(c => c.effectiveDate)).size;
					totalProgress += (completedDays / totalDays) * gh.weight;
				}
			}

			// Normalize progress (weights should sum to 1)
			const progress = goalHabits.length > 0 ? Math.min(1, totalProgress) : 0;

			goalsWithProgress.push({ ...goal, linkedHabits, progress, daysRemaining });
		}

		goals = goalsWithProgress;
		loading = false;
	}

	onMount(() => {
		loadGoals();
	});

	function getStatusIcon(progress: number, daysRemaining: number) {
		if (daysRemaining < 0) return AlertCircle;
		if (progress >= 0.8) return CheckCircle;
		return Clock;
	}

	function getStatusColor(progress: number, daysRemaining: number): string {
		if (daysRemaining < 0) return 'var(--color-error)';
		if (progress >= 0.8) return 'var(--color-success)';
		if (progress >= 0.5) return 'var(--color-warning)';
		return 'var(--color-text-muted)';
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
		<ul class="goal-list">
			{#each goals as goal, i (goal.id)}
				<li class="goal-card animate-slide-up" style="animation-delay: {i * 50}ms">
					<div class="goal-header">
						<div class="goal-icon" style="color: {getStatusColor(goal.progress, goal.daysRemaining)}">
							<svelte:component this={getStatusIcon(goal.progress, goal.daysRemaining)} size={20} />
						</div>
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
						<span 
							class="goal-deadline"
							class:overdue={goal.daysRemaining < 0}
							class:urgent={goal.daysRemaining >= 0 && goal.daysRemaining <= 7}
						>
							{#if goal.daysRemaining < 0}
								{Math.abs(goal.daysRemaining)}d overdue
							{:else if goal.daysRemaining === 0}
								Due today
							{:else}
								{goal.daysRemaining}d left
							{/if}
						</span>
					</div>

					{#if goal.linkedHabits.length > 2}
						<div class="linked-habits-list">
							{#each goal.linkedHabits as habitName}
								<span class="habit-tag">{habitName}</span>
							{/each}
						</div>
					{/if}

					<div class="progress-section">
						<div class="progress-track">
							<div 
								class="progress-fill" 
								style="width: {goal.progress * 100}%; background: {getStatusColor(goal.progress, goal.daysRemaining)}"
							></div>
						</div>
						<span class="progress-text">{(goal.progress * 100).toFixed(0)}%</span>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.goal-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.goal-card {
		background: var(--color-surface);
		backdrop-filter: blur(20px);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
	}

	.goal-header {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}

	.goal-icon {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface-hover);
		border-radius: 50%;
		flex-shrink: 0;
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

	.linked-habits-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
	}

	.habit-tag {
		padding: var(--space-1) var(--space-2);
		font-size: 0.75rem;
		background: var(--color-surface-hover);
		border-radius: var(--radius-sm);
		color: var(--color-text-secondary);
	}

	.goal-deadline {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-text-muted);
		padding: var(--space-1) var(--space-2);
		background: var(--color-surface-hover);
		border-radius: var(--radius-sm);
		white-space: nowrap;
	}

	.goal-deadline.overdue {
		color: var(--color-error);
		background: rgba(248, 113, 113, 0.1);
	}

	.goal-deadline.urgent {
		color: var(--color-warning);
		background: rgba(251, 191, 36, 0.1);
	}

	.progress-section {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.progress-track {
		flex: 1;
		height: 8px;
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
		font-size: 0.875rem;
		font-weight: 600;
		min-width: 40px;
		text-align: right;
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
