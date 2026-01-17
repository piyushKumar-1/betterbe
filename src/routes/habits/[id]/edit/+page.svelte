<!--
	Edit Habit Page
-->
<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { getHabit, updateHabit } from '$lib/db/habits';
	import type { Habit, HabitType, TargetDirection } from '$lib/db/schema';
	import { ArrowLeft, Check } from 'lucide-svelte';

	let habit = $state<Habit | null>(null);
	let name = $state('');
	let description = $state('');
	let unit = $state('');
	let targetValue = $state<number | undefined>(undefined);
	let targetDirection = $state<TargetDirection>('at_least');
	let saving = $state(false);
	let error = $state('');
	let loading = $state(true);

	async function loadHabit() {
		const id = $page.params.id;
		if (!id) {
			goto(`${base}/habits`);
			return;
		}

		loading = true;
		const h = await getHabit(id);
		
		if (!h) {
			goto(`${base}/habits`);
			return;
		}

		habit = h;
		name = h.name;
		description = h.description ?? '';
		unit = h.unit ?? '';
		targetValue = h.targetValue;
		targetDirection = h.targetDirection ?? 'at_least';
		loading = false;
	}

	onMount(() => {
		loadHabit();
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		
		if (!habit) return;
		
		if (!name.trim()) {
			error = 'Name is required';
			return;
		}

		saving = true;
		error = '';

		try {
			await updateHabit(habit.id, {
				name: name.trim(),
				description: description.trim() || undefined,
				unit: unit.trim() || undefined,
				targetValue,
				targetDirection
			});

			goto(`${base}/habits/${habit.id}`);
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
	{:else if habit}
		<header class="header">
			<a href="{base}/habits/{habit.id}" class="btn btn-icon btn-ghost">
				<ArrowLeft size={20} />
			</a>
			<h1>Edit Habit</h1>
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

			<div class="info-box">
				<strong>Type:</strong> {habit.type}
				<p class="hint">Type cannot be changed after creation.</p>
			</div>

			{#if habit.type !== 'binary'}
				<div class="form-group">
					<label for="unit">Unit</label>
					<input 
						id="unit" 
						type="text" 
						bind:value={unit}
						placeholder="minutes, glasses, etc."
					/>
				</div>

				<div class="form-row">
					<div class="form-group">
						<label for="target">Target</label>
						<input 
							id="target" 
							type="number" 
							bind:value={targetValue}
							min="0"
							step="1"
						/>
					</div>

					<div class="form-group">
						<label for="direction">Goal type</label>
						<select id="direction" bind:value={targetDirection}>
							<option value="at_least">At least</option>
							<option value="at_most">At most</option>
							<option value="exactly">Exactly</option>
						</select>
					</div>
				</div>
			{/if}

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

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
	}

	.info-box {
		padding: var(--space-4);
		background: var(--color-surface-solid);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
	}

	.info-box strong {
		text-transform: capitalize;
	}

	.hint {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		margin-top: var(--space-1);
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
