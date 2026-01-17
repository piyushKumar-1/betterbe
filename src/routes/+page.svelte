<!--
	Today Page - Daily Check-in
	Modern design with fluid interactions
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { APP_NAME } from '$lib/config/branding';
	import { selectedDate, formattedDate, isToday, habits, todayCheckIns } from '$lib/stores/ui';
	import { getActiveHabits } from '$lib/db/habits';
	import { getCheckInsForDate, toggleBinaryCheckIn, createCheckIn, getCheckIn } from '$lib/db/checkins';
	import { calculateMomentum, getMomentumArrow } from '$lib/analytics/momentum';
	import type { Habit, CheckIn } from '$lib/db/schema';
	import type { MomentumData } from '$lib/analytics/momentum';
	import { ChevronLeft, ChevronRight, Check, Circle, Plus, X, TrendingUp, TrendingDown, Minus } from 'lucide-svelte';

	let loading = $state(true);
	let habitMomentum = $state<Map<string, MomentumData>>(new Map());
	let showValueInput = $state<string | null>(null);
	let inputValue = $state<number>(0);

	// Load habits and check-ins
	async function loadData() {
		loading = true;
		
		const activeHabits = await getActiveHabits();
		habits.set(activeHabits);

		const checkIns = await getCheckInsForDate($selectedDate);
		const checkInMap = new Map<string, CheckIn>();
		checkIns.forEach(c => checkInMap.set(c.habitId, c));
		todayCheckIns.set(checkInMap);

		const momentumMap = new Map<string, MomentumData>();
		for (const habit of activeHabits) {
			const momentum = await calculateMomentum(habit.id);
			momentumMap.set(habit.id, momentum);
		}
		habitMomentum = momentumMap;

		loading = false;
	}

	onMount(() => {
		loadData();
	});

	$effect(() => {
		$selectedDate;
		loadData();
	});

	async function handleBinaryToggle(habitId: string) {
		const isNow = await toggleBinaryCheckIn(habitId, $selectedDate);
		
		todayCheckIns.update(map => {
			if (isNow) {
				map.set(habitId, {
					id: crypto.randomUUID(),
					habitId,
					value: 1,
					timestamp: new Date(),
					effectiveDate: $selectedDate.toISOString().split('T')[0]
				});
			} else {
				map.delete(habitId);
			}
			return new Map(map);
		});
	}

	async function handleValueSubmit(habit: Habit) {
		if (inputValue <= 0) {
			showValueInput = null;
			return;
		}

		const existing = await getCheckIn(habit.id, $selectedDate);
		if (existing) {
			await toggleBinaryCheckIn(habit.id, $selectedDate);
		}

		await createCheckIn({
			habitId: habit.id,
			value: inputValue,
			effectiveDate: $selectedDate
		});

		todayCheckIns.update(map => {
			map.set(habit.id, {
				id: crypto.randomUUID(),
				habitId: habit.id,
				value: inputValue,
				timestamp: new Date(),
				effectiveDate: $selectedDate.toISOString().split('T')[0]
			});
			return new Map(map);
		});

		showValueInput = null;
		inputValue = 0;
	}

	function openValueInput(habit: Habit) {
		const existing = $todayCheckIns.get(habit.id);
		inputValue = existing?.value ?? habit.targetValue ?? 0;
		showValueInput = habit.id;
	}

	function getMomentumIcon(direction: string) {
		if (direction === 'improving') return TrendingUp;
		if (direction === 'declining') return TrendingDown;
		return Minus;
	}

	// Calculate completion stats
	function getCompletionStats() {
		const total = $habits.length;
		const completed = $habits.filter(h => $todayCheckIns.has(h.id)).length;
		return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
	}
</script>

<div class="container">
	<!-- Header -->
	<header class="header animate-fade-in">
		<div class="date-nav">
			<button class="btn btn-icon btn-ghost" onclick={() => selectedDate.goBack()}>
				<ChevronLeft size={20} />
			</button>
			<div class="date-display">
				<h1 class="date-title">{$formattedDate}</h1>
				<p class="date-subtitle">
					{$selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
				</p>
			</div>
			<button 
				class="btn btn-icon btn-ghost" 
				onclick={() => selectedDate.goForward()}
				disabled={$isToday}
			>
				<ChevronRight size={20} />
			</button>
		</div>
		{#if !$isToday}
			<button class="btn btn-secondary" onclick={() => selectedDate.setToday()}>
				Today
			</button>
		{/if}
	</header>

	<!-- Progress ring -->
	{#if !loading && $habits.length > 0}
		{@const stats = getCompletionStats()}
		<div class="progress-card animate-slide-up">
			<div class="progress-ring-container">
				<svg class="progress-ring" viewBox="0 0 100 100">
					<circle class="progress-ring-bg" cx="50" cy="50" r="42" />
					<circle 
						class="progress-ring-fill" 
						cx="50" cy="50" r="42"
						style="stroke-dashoffset: {264 - (264 * stats.percentage / 100)}"
					/>
				</svg>
				<div class="progress-ring-text">
					<span class="progress-value">{stats.completed}</span>
					<span class="progress-label">of {stats.total}</span>
				</div>
			</div>
			<div class="progress-info">
				<h2>Daily Progress</h2>
				<p class="text-muted">{stats.percentage}% complete</p>
			</div>
		</div>
	{/if}

	<!-- Habits list -->
	{#if loading}
		<div class="habit-list">
			{#each [1, 2, 3] as _}
				<div class="habit-card skeleton-card">
					<div class="skeleton" style="width: 48px; height: 48px; border-radius: 50%;"></div>
					<div class="skeleton-content">
						<div class="skeleton" style="width: 60%; height: 16px;"></div>
						<div class="skeleton" style="width: 40%; height: 12px; margin-top: 8px;"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if $habits.length === 0}
		<div class="empty-state animate-fade-in">
			<div class="empty-icon">📋</div>
			<h3>No habits yet</h3>
			<p>Start tracking your first habit</p>
			<a href="/habits/new" class="btn btn-primary mt-4">
				<Plus size={18} />
				Create Habit
			</a>
		</div>
	{:else}
		<ul class="habit-list">
			{#each $habits as habit, i (habit.id)}
				{@const checkIn = $todayCheckIns.get(habit.id)}
				{@const isCompleted = !!checkIn}
				{@const momentum = habitMomentum.get(habit.id)}

				<li 
					class="habit-card animate-slide-up" 
					class:completed={isCompleted}
					style="animation-delay: {i * 50}ms"
				>
					{#if habit.type === 'binary'}
						<button class="habit-button" onclick={() => handleBinaryToggle(habit.id)}>
							<div class="habit-check" class:checked={isCompleted}>
								{#if isCompleted}
									<Check size={24} strokeWidth={3} />
								{:else}
									<Circle size={24} />
								{/if}
							</div>
							<div class="habit-content">
								<span class="habit-name">{habit.name}</span>
								{#if momentum}
									<div class="habit-momentum momentum-{momentum.direction}">
										<svelte:component this={getMomentumIcon(momentum.direction)} size={14} />
										<span>{momentum.direction}</span>
									</div>
								{/if}
							</div>
						</button>
					{:else}
						<button class="habit-button" onclick={() => openValueInput(habit)}>
							<div class="habit-check" class:checked={isCompleted}>
								{#if isCompleted}
									<Check size={24} strokeWidth={3} />
								{:else}
									<Circle size={24} />
								{/if}
							</div>
							<div class="habit-content">
								<span class="habit-name">{habit.name}</span>
								<div class="habit-meta">
									{#if checkIn}
										<span class="habit-value">{checkIn.value} {habit.unit ?? ''}</span>
									{:else if habit.targetValue}
										<span class="text-muted">Target: {habit.targetValue} {habit.unit ?? ''}</span>
									{/if}
								</div>
							</div>
							{#if momentum}
								<div class="habit-momentum-badge momentum-{momentum.direction}">
									<svelte:component this={getMomentumIcon(momentum.direction)} size={16} />
								</div>
							{/if}
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<!-- Value input modal -->
{#if showValueInput}
	{@const habit = $habits.find(h => h.id === showValueInput)}
	{#if habit}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal-backdrop" onclick={() => showValueInput = null}>
			<div class="modal animate-slide-up" onclick={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<h3>{habit.name}</h3>
					<button class="btn btn-icon btn-ghost" onclick={() => showValueInput = null}>
						<X size={20} />
					</button>
				</div>
				<div class="input-group">
					<input 
						type="number" 
						bind:value={inputValue}
						min="0"
						step={habit.type === 'duration' ? 5 : 1}
						class="value-input"
					/>
					{#if habit.unit}
						<span class="input-unit">{habit.unit}</span>
					{/if}
				</div>
				<div class="modal-actions">
					<button class="btn btn-secondary" onclick={() => showValueInput = null}>Cancel</button>
					<button class="btn btn-primary" onclick={() => handleValueSubmit(habit)}>Save</button>
				</div>
			</div>
		</div>
	{/if}
{/if}

<style>
	.header {
		margin-bottom: var(--space-6);
	}

	.date-nav {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.date-display {
		flex: 1;
		text-align: center;
	}

	.date-title {
		font-size: 1.5rem;
		font-weight: 700;
		background: linear-gradient(135deg, var(--color-text) 0%, var(--color-text-secondary) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.date-subtitle {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		margin-top: var(--space-1);
	}

	/* Progress card */
	.progress-card {
		display: flex;
		align-items: center;
		gap: var(--space-5);
		background: var(--color-surface);
		backdrop-filter: blur(20px);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: var(--space-5);
		margin-bottom: var(--space-6);
	}

	.progress-ring-container {
		position: relative;
		width: 80px;
		height: 80px;
	}

	.progress-ring {
		transform: rotate(-90deg);
	}

	.progress-ring-bg {
		fill: none;
		stroke: var(--color-surface-hover);
		stroke-width: 8;
	}

	.progress-ring-fill {
		fill: none;
		stroke: url(#gradient);
		stroke: var(--color-primary);
		stroke-width: 8;
		stroke-linecap: round;
		stroke-dasharray: 264;
		transition: stroke-dashoffset var(--transition-slow);
	}

	.progress-ring-text {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.progress-value {
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1;
	}

	.progress-label {
		font-size: 0.625rem;
		color: var(--color-text-muted);
	}

	.progress-info h2 {
		font-size: 1rem;
		margin-bottom: var(--space-1);
	}

	/* Habit list */
	.habit-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
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
		background: var(--color-surface-hover);
	}

	.habit-card.completed {
		border-color: var(--color-success-soft);
		background: var(--color-success-soft);
	}

	.habit-button {
		width: 100%;
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4);
		background: none;
		border: none;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.habit-check {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: var(--color-surface-hover);
		color: var(--color-text-muted);
		transition: all var(--transition-bounce);
	}

	.habit-check.checked {
		background: var(--color-success);
		color: white;
		animation: checkmark var(--transition-bounce);
	}

	.habit-content {
		flex: 1;
		min-width: 0;
	}

	.habit-name {
		display: block;
		font-weight: 600;
		font-size: 1rem;
		margin-bottom: var(--space-1);
	}

	.habit-meta {
		font-size: 0.875rem;
	}

	.habit-value {
		color: var(--color-success);
		font-weight: 500;
	}

	.habit-momentum {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		font-size: 0.75rem;
		text-transform: capitalize;
	}

	.habit-momentum-badge {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: var(--color-surface);
	}

	.momentum-improving { color: var(--color-momentum-up); }
	.momentum-stable { color: var(--color-momentum-flat); }
	.momentum-declining { color: var(--color-momentum-down); }

	/* Skeleton */
	.skeleton-card {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4);
	}

	.skeleton-content {
		flex: 1;
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

	/* Modal */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding: var(--space-4);
		z-index: 200;
	}

	.modal {
		background: var(--color-surface-solid);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl) var(--radius-xl) 0 0;
		padding: var(--space-6);
		width: 100%;
		max-width: 400px;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-5);
	}

	.modal-header h3 {
		font-size: 1.25rem;
	}

	.input-group {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-5);
	}

	.value-input {
		font-size: 2rem;
		font-weight: 700;
		text-align: center;
		padding: var(--space-4);
	}

	.input-unit {
		font-size: 1rem;
		color: var(--color-text-muted);
	}

	.modal-actions {
		display: flex;
		gap: var(--space-3);
	}

	.modal-actions .btn {
		flex: 1;
		padding: var(--space-4);
	}
</style>
