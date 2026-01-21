<!--
	Edit Habit Page
-->
<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { getHabit, updateHabit } from '$lib/data/habits';
	import { getReminderForHabit, upsertReminder, deleteReminder } from '$lib/data/reminders';
	import type { Habit, HabitType, TargetDirection, ReminderType } from '$lib/db/schema';
	import { ArrowLeft, Check, Bell, Clock, Shuffle } from 'lucide-svelte';
	import { Toggle } from '$lib/components';

	let habit = $state<Habit | null>(null);
	let name = $state('');
	let description = $state('');
	let unit = $state('');
	let targetValue = $state<number | undefined>(undefined);
	let targetDirection = $state<TargetDirection>('at_least');
	let saving = $state(false);
	let error = $state('');
	let loading = $state(true);

	// Reminder settings
	let reminderEnabled = $state(false);
	let reminderType = $state<ReminderType>('daily');
	let intervalHours = $state(2);
	let dailyTime = $state('09:00');
	let randomWindowStart = $state('09:00');
	let randomWindowEnd = $state('21:00');

	const reminderTypes = [
		{ value: 'interval', label: 'Every X hours', icon: Clock, desc: 'Repeat throughout day' },
		{ value: 'daily', label: 'Daily', icon: Bell, desc: 'Once at specific time' },
		{ value: 'random', label: 'Random nudge', icon: Shuffle, desc: 'Surprise me once daily' }
	] as const;

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

		// Load reminder settings
		const reminder = await getReminderForHabit(id);
		if (reminder) {
			reminderEnabled = reminder.enabled;
			reminderType = reminder.type;
			intervalHours = reminder.intervalHours ?? 2;
			dailyTime = reminder.dailyTime ?? '09:00';
			randomWindowStart = reminder.randomWindowStart ?? '09:00';
			randomWindowEnd = reminder.randomWindowEnd ?? '21:00';
		}

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

			// Update reminder settings
			if (reminderEnabled) {
				await upsertReminder({
					habitId: habit.id,
					type: reminderType,
					intervalHours: reminderType === 'interval' ? intervalHours : undefined,
					dailyTime: reminderType === 'daily' ? dailyTime : undefined,
					randomWindowStart: reminderType === 'random' ? randomWindowStart : undefined,
					randomWindowEnd: reminderType === 'random' ? randomWindowEnd : undefined
				});
			} else {
				await deleteReminder(habit.id);
			}

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

			<!-- Reminder Settings -->
			<Toggle bind:checked={reminderEnabled} label="Enable reminders" />

			{#if reminderEnabled}
				<div class="reminder-section animate-fade-in">
					<label>Reminder type</label>
					<div class="reminder-grid">
						{#each reminderTypes as r}
							<button 
								type="button"
								class="reminder-card"
								class:selected={reminderType === r.value}
								onclick={() => reminderType = r.value}
							>
								<svelte:component this={r.icon} size={20} />
								<span class="reminder-name">{r.label}</span>
							</button>
						{/each}
					</div>

					{#if reminderType === 'interval'}
						<div class="form-group animate-fade-in">
							<label for="interval">Remind every</label>
							<div class="input-with-suffix">
								<input 
									id="interval" 
									type="number" 
									bind:value={intervalHours}
									min="1"
									max="12"
								/>
								<span class="input-suffix">hours</span>
							</div>
						</div>
					{:else if reminderType === 'daily'}
						<div class="form-group animate-fade-in">
							<label for="daily-time">Reminder time</label>
							<input 
								id="daily-time" 
								type="time" 
								bind:value={dailyTime}
							/>
						</div>
					{:else if reminderType === 'random'}
						<div class="form-row animate-fade-in">
							<div class="form-group">
								<label for="random-start">Between</label>
								<input 
									id="random-start" 
									type="time" 
									bind:value={randomWindowStart}
								/>
							</div>
							<div class="form-group">
								<label for="random-end">And</label>
								<input 
									id="random-end" 
									type="time" 
									bind:value={randomWindowEnd}
								/>
							</div>
						</div>
					{/if}
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

	/* Reminder Section */
	.reminder-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-4);
		background: var(--color-surface);
		border-radius: var(--radius-lg);
	}

	.reminder-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-2);
	}

	.reminder-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-3);
		background: var(--color-surface-hover);
		border: 2px solid transparent;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--transition-fast);
		color: var(--color-text-secondary);
		font: inherit;
	}

	.reminder-card:hover {
		background: var(--color-surface-active);
	}

	.reminder-card.selected {
		border-color: var(--color-primary);
		background: var(--color-primary-soft);
		color: var(--color-primary);
	}

	.reminder-name {
		font-size: 0.75rem;
		font-weight: 500;
		text-align: center;
	}

	.input-with-suffix {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.input-with-suffix input {
		flex: 1;
	}

	.input-suffix {
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}
</style>
