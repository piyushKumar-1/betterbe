<!--
	Edit Goal Page
-->
<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { getGoal, updateGoal } from '$lib/db/goals';
	import type { Goal } from '$lib/db/schema';
	import { ArrowLeft, Check } from 'lucide-svelte';

	let goal = $state<Goal | null>(null);
	let name = $state('');
	let description = $state('');
	let deadline = $state('');
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
		loading = false;
	}

	onMount(() => {
		loadGoal();
	});

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

			<div class="info-box">
				<p class="hint">Linked habits cannot be changed. Create a new goal to link different habits.</p>
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

	.info-box {
		padding: var(--space-4);
		background: var(--color-surface-solid);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
	}

	.hint {
		font-size: 0.75rem;
		color: var(--color-text-muted);
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
