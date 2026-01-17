<!--
	New Goal Page - Multi-Habit Support
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { createGoal } from '$lib/db/goals';
	import { getActiveHabits } from '$lib/db/habits';
	import type { Habit } from '$lib/db/schema';
	import { ArrowLeft, Calendar, Link2, Check } from 'lucide-svelte';

	let name = $state('');
	let description = $state('');
	let deadline = $state('');
	let selectedHabitIds = $state<Set<string>>(new Set());
	let habits = $state<Habit[]>([]);
	let saving = $state(false);
	let error = $state('');

	onMount(async () => {
		habits = await getActiveHabits();
		
		const defaultDeadline = new Date();
		defaultDeadline.setDate(defaultDeadline.getDate() + 30);
		deadline = defaultDeadline.toISOString().split('T')[0];
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
			await createGoal({
				name: name.trim(),
				description: description.trim() || undefined,
				deadline: new Date(deadline),
				habitIds: selectedHabitIds.size > 0 ? Array.from(selectedHabitIds) : undefined
			});

			goto(`${base}/goals`);
		} catch (err) {
			error = 'Failed to create goal';
			console.error(err);
		} finally {
			saving = false;
		}
	}
</script>

<div class="container">
	<header class="page-header animate-fade-in">
		<a href="{base}/goals" class="btn btn-icon btn-ghost">
			<ArrowLeft size={20} />
		</a>
		<h1>New Goal</h1>
		<div style="width: 40px"></div>
	</header>

	<form onsubmit={handleSubmit} class="form animate-slide-up">
		<div class="form-group">
			<label for="name">What's your goal?</label>
			<input 
				id="name" 
				type="text" 
				bind:value={name}
				placeholder="e.g., Run a marathon, Read 24 books"
				required
			/>
		</div>

		<div class="form-group">
			<label for="description">Why is this important? (optional)</label>
			<textarea 
				id="description" 
				bind:value={description}
				placeholder="Describe what achieving this means to you"
				rows="2"
			></textarea>
		</div>

		<div class="form-group">
			<label for="deadline">
				<Calendar size={16} />
				Deadline
			</label>
			<input 
				id="deadline" 
				type="date" 
				bind:value={deadline}
				required
			/>
		</div>

		<div class="form-group">
			<label>
				<Link2 size={16} />
				Link to habits (optional)
			</label>
			<p class="hint mb-3">Select one or more habits to track progress. Equal weight is given to each.</p>
			
			{#if habits.length === 0}
				<p class="text-muted">No habits to link. Create habits first.</p>
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
			{saving ? 'Creating...' : 'Create Goal'}
		</button>
	</form>
</div>

<style>
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
