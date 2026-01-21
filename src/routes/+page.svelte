<!--
	Today Page - Inline Steppers for Numeric Habits
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { APP_NAME } from '$lib/config/branding';
	import { selectedDate, formattedDate, isToday, habits, todayCheckIns } from '$lib/stores/ui';
	import { getActiveHabits } from '$lib/data/habits';
	import { getCheckInsForDate, toggleBinaryCheckIn, createCheckIn, updateCheckIn, deleteCheckIn } from '$lib/data/checkins';
	import { calculateMomentum } from '$lib/analytics/momentum';
	import type { Habit, CheckIn } from '$lib/db/schema';
	import type { MomentumData } from '$lib/analytics/momentum';
	import { ChevronLeft, ChevronRight, Check, Plus, Minus, TrendingUp, TrendingDown } from 'lucide-svelte';

	let loading = $state(true);
	let habitMomentum = $state<Map<string, MomentumData>>(new Map());
	let editingValue = $state<string | null>(null);
	let tempInputValue = $state('');

	async function loadData() {
		loading = true;
		
		// Load habits and check-ins first (fast)
		const [activeHabits, checkIns] = await Promise.all([
			getActiveHabits(),
			getCheckInsForDate($selectedDate)
		]);
		
		habits.set(activeHabits);

		const checkInMap = new Map<string, CheckIn>();
		checkIns.forEach(c => checkInMap.set(c.habitId, c));
		todayCheckIns.set(checkInMap);

		loading = false;

		// Load momentum in background (slow - don't block UI)
		loadMomentum(activeHabits);
	}

	async function loadMomentum(activeHabits: Habit[]) {
		const momentumMap = new Map<string, MomentumData>();
		
		// Calculate all in parallel for speed
		const results = await Promise.all(
			activeHabits.map(async (habit) => ({
				id: habit.id,
				momentum: await calculateMomentum(habit.id)
			}))
		);
		
		results.forEach(r => momentumMap.set(r.id, r.momentum));
		habitMomentum = momentumMap;
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

	async function updateNumericValue(habit: Habit, newValue: number) {
		const value = Math.max(0, newValue);
		const existing = $todayCheckIns.get(habit.id);

		if (value === 0 && existing) {
			// Remove check-in if value is 0
			await deleteCheckIn(existing.id);
			todayCheckIns.update(map => {
				map.delete(habit.id);
				return new Map(map);
			});
		} else if (value > 0) {
			if (existing) {
				// Update existing check-in (don't delete and recreate)
				await updateCheckIn(existing.id, { value });
				todayCheckIns.update(map => {
					map.set(habit.id, { ...existing, value });
					return new Map(map);
				});
			} else {
				// Create new check-in
				await createCheckIn({
					habitId: habit.id,
					value,
					effectiveDate: $selectedDate
				});
				todayCheckIns.update(map => {
					map.set(habit.id, {
						id: crypto.randomUUID(),
						habitId: habit.id,
						value,
						timestamp: new Date(),
						effectiveDate: $selectedDate.toISOString().split('T')[0]
					});
					return new Map(map);
				});
			}
		}
	}

	async function increment(habit: Habit) {
		const current = $todayCheckIns.get(habit.id)?.value ?? 0;
		await updateNumericValue(habit, current + 1);
	}

	async function decrement(habit: Habit) {
		const current = $todayCheckIns.get(habit.id)?.value ?? 0;
		await updateNumericValue(habit, current - 1);
	}

	function startEdit(habitId: string, currentValue: number) {
		editingValue = habitId;
		tempInputValue = currentValue.toString();
	}

	function commitEdit(habit: Habit) {
		const value = parseInt(tempInputValue) || 0;
		updateNumericValue(habit, value);
		editingValue = null;
	}

	function handleKeyDown(e: KeyboardEvent, habit: Habit) {
		if (e.key === 'Enter') {
			commitEdit(habit);
		} else if (e.key === 'Escape') {
			editingValue = null;
		}
	}

	function getCompletionStats() {
		const total = $habits.length;
		const completed = $habits.filter(h => {
			const checkIn = $todayCheckIns.get(h.id);
			if (!checkIn) return false;
			
			// For binary, any check-in counts
			if (h.type === 'binary') return true;
			
			// For numeric types, check if target is met
			if (h.targetValue) {
				if (h.targetDirection === 'at_least') return checkIn.value >= h.targetValue;
				if (h.targetDirection === 'at_most') return checkIn.value <= h.targetValue;
				if (h.targetDirection === 'exactly') return checkIn.value === h.targetValue;
			}
			
			// If no target, any value counts
			return checkIn.value > 0;
		}).length;
		return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
	}

	function getMomentumIcon(direction: string) {
		if (direction === 'improving') return TrendingUp;
		if (direction === 'declining') return TrendingDown;
		return Minus;
	}
</script>

<div class="container">
	<!-- Header -->
	<header class="header">
		<div class="date-nav">
			<button class="nav-btn" onclick={() => selectedDate.goBack()}>
				<ChevronLeft size={28} strokeWidth={2.5} />
			</button>
			<div class="date-display">
				<span class="date-label">{$formattedDate}</span>
				<span class="date-full">
					{$selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
				</span>
			</div>
			<button 
				class="nav-btn" 
				onclick={() => selectedDate.goForward()}
				disabled={$isToday}
			>
				<ChevronRight size={28} strokeWidth={2.5} />
			</button>
		</div>
	</header>

	<!-- Progress Summary -->
	{#if !loading && $habits.length > 0}
		{@const stats = getCompletionStats()}
		<div class="progress-summary animate-fade-in">
			<div class="progress-ring-wrap">
				<svg class="progress-ring" viewBox="0 0 60 60">
					<circle class="progress-ring-bg" cx="30" cy="30" r="26" />
					<circle 
						class="progress-ring-fill" 
						cx="30" cy="30" r="26"
						style="stroke-dashoffset: {163 - (163 * stats.percentage / 100)}"
					/>
				</svg>
				<span class="progress-percent">{stats.percentage}%</span>
			</div>
			<div class="progress-text">
				<span class="progress-count">{stats.completed} of {stats.total}</span>
				<span class="progress-label">completed</span>
			</div>
		</div>
	{/if}

	<!-- Habits List -->
	{#if loading}
		<div class="habits-list">
			{#each [1, 2, 3] as _}
				<div class="habit-row skeleton-row">
					<div class="skeleton" style="width: 52px; height: 52px; border-radius: 50%;"></div>
					<div style="flex: 1;">
						<div class="skeleton" style="width: 60%; height: 18px; margin-bottom: 8px;"></div>
						<div class="skeleton" style="width: 40%; height: 14px;"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if $habits.length === 0}
		<div class="empty-state">
			<span class="empty-icon">✨</span>
			<h3>No habits yet</h3>
			<p>Create your first habit to get started</p>
			<a href="{base}/habits/new" class="btn btn-primary">
				<Plus size={20} />
				Create Habit
			</a>
		</div>
	{:else}
		<div class="habits-list">
			{#each $habits as habit, i (habit.id)}
				{@const checkIn = $todayCheckIns.get(habit.id)}
				{@const isCompleted = !!checkIn}
				{@const currentValue = checkIn?.value ?? 0}
				{@const momentum = habitMomentum.get(habit.id)}

				<div 
					class="habit-row animate-slide-up"
					class:completed={isCompleted}
					style="animation-delay: {i * 40}ms"
				>
					{#if habit.type === 'binary'}
						<!-- Binary: Tap to toggle -->
						<button class="habit-tap-area" onclick={() => handleBinaryToggle(habit.id)}>
							<div class="habit-content">
								<span class="habit-name">{habit.name}</span>
								{#if momentum}
									<span class="habit-momentum momentum-{momentum.direction}">
										<svelte:component this={getMomentumIcon(momentum.direction)} size={14} />
										{momentum.direction}
									</span>
								{/if}
							</div>
							<div class="habit-check" class:checked={isCompleted}>
								{#if isCompleted}
									<Check size={28} strokeWidth={3} />
								{/if}
							</div>
						</button>
					{:else}
						<!-- Numeric/Duration/Scale: Stepper controls -->
						<div class="habit-content-area">
							<div class="habit-info">
								<span class="habit-name">{habit.name}</span>
								<span class="habit-target-hint">
									{#if habit.targetValue}
										Target: {habit.targetValue} {habit.unit ?? ''}
									{/if}
								</span>
							</div>
							<div class="stepper">
								<button 
									class="stepper-btn"
									onclick={() => decrement(habit)}
									disabled={currentValue === 0}
								>
									<Minus size={20} strokeWidth={2.5} />
								</button>
								
								{#if editingValue === habit.id}
									<input
										type="number"
										class="stepper-input"
										bind:value={tempInputValue}
										onblur={() => commitEdit(habit)}
										onkeydown={(e) => handleKeyDown(e, habit)}
										autofocus
									/>
								{:else}
									<button 
										class="stepper-value"
										class:has-value={currentValue > 0}
										onclick={() => startEdit(habit.id, currentValue)}
									>
										{currentValue}
										{#if habit.unit}
											<span class="stepper-unit">{habit.unit}</span>
										{/if}
									</button>
								{/if}
								
								<button 
									class="stepper-btn"
									onclick={() => increment(habit)}
								>
									<Plus size={20} strokeWidth={2.5} />
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.header {
		margin-bottom: var(--space-5);
	}

	.date-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		background: none;
		border: none;
		color: var(--color-primary);
		cursor: pointer;
		border-radius: var(--radius-md);
		transition: opacity var(--transition-tap);
	}

	.nav-btn:active {
		opacity: 0.5;
	}

	.nav-btn:disabled {
		color: var(--color-text-muted);
		opacity: 0.3;
	}

	.date-display {
		text-align: center;
	}

	.date-label {
		display: block;
		font-size: 1.75rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.date-full {
		font-size: 0.875rem;
		color: var(--color-text-muted);
	}

	/* Progress Summary */
	.progress-summary {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4);
		background: var(--color-surface-solid);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-6);
	}

	.progress-ring-wrap {
		position: relative;
		width: 60px;
		height: 60px;
	}

	.progress-ring {
		transform: rotate(-90deg);
	}

	.progress-ring-bg {
		fill: none;
		stroke: var(--color-surface-hover);
		stroke-width: 6;
	}

	.progress-ring-fill {
		fill: none;
		stroke: var(--color-primary);
		stroke-width: 6;
		stroke-linecap: round;
		stroke-dasharray: 163;
		transition: stroke-dashoffset var(--transition-slow);
	}

	.progress-percent {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: 700;
	}

	.progress-text {
		display: flex;
		flex-direction: column;
	}

	.progress-count {
		font-size: 1.125rem;
		font-weight: 600;
	}

	.progress-label {
		font-size: 0.875rem;
		color: var(--color-text-muted);
	}

	/* Habits List */
	.habits-list {
		display: flex;
		flex-direction: column;
	}

	.habit-row {
		display: flex;
		background: var(--color-surface-solid);
		margin-bottom: 1px;
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

	/* Binary habit - tappable */
	.habit-tap-area {
		flex: 1;
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
		transition: background var(--transition-tap);
	}

	.habit-tap-area:active {
		background: var(--color-surface-active);
	}

	.habit-check {
		width: 52px;
		height: 52px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: var(--color-surface-hover);
		color: var(--color-text-muted);
		transition: all var(--transition-fast);
		flex-shrink: 0;
	}

	.habit-check.checked {
		background: var(--color-success);
		color: white;
		animation: checkPop var(--transition-spring);
	}

	.habit-content {
		flex: 1;
		min-width: 0;
	}

	.habit-name {
		display: block;
		font-size: 1.0625rem;
		font-weight: 600;
		margin-bottom: 2px;
	}

	.habit-momentum {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.875rem;
		text-transform: capitalize;
	}

	.momentum-improving { color: var(--color-success); }
	.momentum-stable { color: var(--color-text-muted); }
	.momentum-declining { color: var(--color-warning); }

	/* Numeric habit - stepper */
	.habit-content-area {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-4);
	}

	.habit-info {
		flex: 1;
		min-width: 0;
	}

	.habit-target-hint {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
	}

	.stepper {
		display: flex;
		align-items: center;
		background: var(--color-surface-hover);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.stepper-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		background: none;
		border: none;
		color: var(--color-primary);
		cursor: pointer;
		transition: background var(--transition-tap);
	}

	.stepper-btn:active {
		background: var(--color-surface-active);
	}

	.stepper-btn:disabled {
		color: var(--color-text-muted);
		opacity: 0.3;
	}

	.stepper-value {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		min-width: 60px;
		height: 48px;
		padding: 0 var(--space-2);
		background: none;
		border: none;
		color: var(--color-text-muted);
		font-size: 1.25rem;
		font-weight: 700;
		cursor: pointer;
	}

	.stepper-value.has-value {
		color: var(--color-success);
	}

	.stepper-unit {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-text-muted);
	}

	.stepper-input {
		width: 60px;
		height: 48px;
		min-height: 48px;
		padding: 0;
		text-align: center;
		font-size: 1.25rem;
		font-weight: 700;
		background: var(--color-bg);
		border: none;
		border-radius: 0;
	}

	.stepper-input:focus {
		box-shadow: none;
	}

	.skeleton-row {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4);
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
