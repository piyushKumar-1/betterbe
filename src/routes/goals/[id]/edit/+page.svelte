<!--
	Edit Goal Page - With Habit Selection
-->
<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { getGoal, updateGoal, getGoalHabits, updateGoalHabits } from '$lib/data/goals';
	import { getActiveHabits } from '$lib/data/habits';
	import type { Goal, Habit } from '$lib/db/schema';
	import { ArrowLeft, Check, Link2 } from 'lucide-svelte';

	let goal = $state<Goal | null>(null);
	let name = $state('');
	let description = $state('');
	let deadline = $state('');
	let habits = $state<Habit[]>([]);
	let selectedHabitIds = $state<Set<string>>(new Set());
	let saving = $state(false);
	let error = $state('');
	let loading = $state(true);

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
		name = g.name;
		description = g.description ?? '';
		deadline = g.deadline;

		// Load all habits and current links
		habits = await getActiveHabits();
		const linkedHabits = await getGoalHabits(id);
		selectedHabitIds = new Set(linkedHabits.map(h => h.habitId));
		
		loading = false;
	}

	onMount(() => {
		loadGoal();
	});

	function toggleHabit(habitId: string) {
		selectedHabitIds = new Set(selectedHabitIds);
		if (selectedHabitIds.has(habitId)) {
			selectedHabitIds.delete(habitId);
		} else {
			selectedHabitIds.add(habitId);
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		
		if (!goal) return;
		
		if (!name.trim()) {
			error = 'Name is required';
			return;
		}

		if (!deadline) {
			error = 'Deadline is required';
			return;
		}

		saving = true;
		error = '';

		try {
			await updateGoal(goal.id, {
				name: name.trim(),
				description: description.trim() || undefined,
				deadline: deadline
			});

			// Update linked habits
			await updateGoalHabits(goal.id, Array.from(selectedHabitIds));

			goto(`${base}/goals/${goal.id}`);
		} catch (err) {
			error = 'Failed to save changes';
			console.error(err);
		} finally {
			saving = false;
		}
	}
</script>

<div class="container">
	{#if loading}
		<div class="loading-state">
			<div class="skeleton" style="height: 48px; width: 100%; margin-bottom: 16px;"></div>
			<div class="skeleton" style="height: 48px; width: 100%;"></div>
		</div>
	{:else if goal}
		<header class="header">
			<a href="{base}/goals/{goal.id}" class="btn btn-icon btn-ghost">
				<ArrowLeft size={20} />
			</a>
			<h1>Edit Goal</h1>
			<div style="width: 44px"></div>
		</header>

		<form onsubmit={handleSubmit} class="form animate-slide-up">
			<div class="form-group">
				<label for="name">Name</label>
				<input 
					id="name" 
					type="text" 
					bind:value={name}
					required
				/>
			</div>

			<div class="form-group">
				<label for="description">Description</label>
				<textarea 
					id="description" 
					bind:value={description}
					rows="2"
				></textarea>
			</div>

			<div class="form-group">
				<label for="deadline">Deadline</label>
				<input 
					id="deadline" 
					type="date" 
					bind:value={deadline}
					required
				/>
			</div>

			<!-- Habit Selection -->
			<div class="form-group">
				<label>
					<Link2 size={16} />
					Linked Habits
				</label>
				<p class="hint mb-3">Select habits to track for this goal. Each habit has equal weight.</p>
				
				{#if habits.length === 0}
					<p class="text-muted">No habits available. Create habits first.</p>
				{:else}
					<div class="habit-select-grid">
						{#each habits as habit}
							<button 
								type="button"
								class="habit-select-item"
								class:selected={selectedHabitIds.has(habit.id)}
								onclick={() => toggleHabit(habit.id)}
							>
								<span class="habit-check">
									{#if selectedHabitIds.has(habit.id)}
										<Check size={16} />
									{/if}
								</span>
								<span class="habit-name">{habit.name}</span>
							</button>
						{/each}
					</div>
				{/if}

				{#if selectedHabitIds.size > 0}
					<p class="selected-count">{selectedHabitIds.size} habit{selectedHabitIds.size > 1 ? 's' : ''} selected</p>
				{/if}
			</div>

			{#if error}
				<p class="error">{error}</p>
			{/if}

			<button type="submit" class="btn btn-primary btn-full" disabled={saving}>
				<Check size={20} />
				{saving ? 'Saving...' : 'Save Changes'}
			</button>
		</form>
	{/if}
</div>

<style>
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-6);
	}

	.loading-state {
		padding-top: var(--space-8);
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.form-group label {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.hint {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.mb-3 {
		margin-bottom: var(--space-3);
	}

	.habit-select-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.habit-select-item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text);
		font: inherit;
		cursor: pointer;
		transition: all var(--transition-fast);
		text-align: left;
	}

	.habit-select-item:hover {
		background: var(--color-surface-hover);
		border-color: var(--color-border-hover);
	}

	.habit-select-item.selected {
		background: var(--color-primary-soft);
		border-color: var(--color-primary);
	}

	.habit-check {
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		background: var(--color-surface-hover);
		color: var(--color-primary);
	}

	.habit-select-item.selected .habit-check {
		background: var(--color-primary);
		color: white;
	}

	.habit-name {
		flex: 1;
	}

	.selected-count {
		font-size: 0.75rem;
		color: var(--color-primary);
		margin-top: var(--space-2);
	}

	.error {
		color: var(--color-error);
		font-size: 0.875rem;
		padding: var(--space-3);
		background: rgba(248, 113, 113, 0.1);
		border-radius: var(--radius-md);
	}

	.btn-full {
		width: 100%;
		padding: var(--space-4);
		font-size: 1rem;
	}
</style>
