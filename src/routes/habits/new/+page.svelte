<!--
	New Habit Page - Modern Design
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { createHabit } from '$lib/db/habits';
	import { upsertReminder } from '$lib/db/reminders';
	import type { HabitType, TargetDirection, ReminderType } from '$lib/db/schema';
	import { ArrowLeft, Check, Hash, Bell, Clock, Shuffle } from 'lucide-svelte';
	import { Toggle } from '$lib/components';

	let name = $state('');
	let description = $state('');
	let type = $state<HabitType>('binary');
	let unit = $state('');
	let targetValue = $state<number | undefined>(undefined);
	let targetDirection = $state<TargetDirection>('at_least');
	let saving = $state(false);
	let error = $state('');

	// Reminder settings
	let reminderEnabled = $state(false);
	let reminderType = $state<ReminderType>('daily');
	let intervalHours = $state(2);
	let dailyTime = $state('09:00');
	let randomWindowStart = $state('09:00');
	let randomWindowEnd = $state('21:00');

	const habitTypes = [
		{ value: 'binary', label: 'Yes/No', icon: Check, desc: 'Did you do it?' },
		{ value: 'numeric', label: 'Count', icon: Hash, desc: 'How many?' }
	] as const;

	const reminderTypes = [
		{ value: 'interval', label: 'Every X hours', icon: Clock, desc: 'Repeat throughout day' },
		{ value: 'daily', label: 'Daily', icon: Bell, desc: 'Once at specific time' },
		{ value: 'random', label: 'Random nudge', icon: Shuffle, desc: 'Surprise me once daily' }
	] as const;

	async function handleSubmit(e: Event) {
		e.preventDefault();
		
		if (!name.trim()) {
			error = 'Name is required';
			return;
		}

		saving = true;
		error = '';

		try {
			const habit = await createHabit({
				name: name.trim(),
				description: description.trim() || undefined,
				type,
				unit: unit.trim() || undefined,
				targetValue,
				targetDirection
			});

			// Create reminder if enabled
			if (reminderEnabled) {
				await upsertReminder({
					habitId: habit.id,
					type: reminderType,
					intervalHours: reminderType === 'interval' ? intervalHours : undefined,
					dailyTime: reminderType === 'daily' ? dailyTime : undefined,
					randomWindowStart: reminderType === 'random' ? randomWindowStart : undefined,
					randomWindowEnd: reminderType === 'random' ? randomWindowEnd : undefined
				});
			}

			goto(`${base}/habits`);
		} catch (err) {
			error = 'Failed to create habit';
			console.error(err);
		} finally {
			saving = false;
		}
	}
</script>

<div class="container">
	<header class="page-header animate-fade-in">
		<a href="{base}/habits" class="btn btn-icon btn-ghost">
			<ArrowLeft size={20} />
		</a>
		<h1>New Habit</h1>
		<div style="width: 40px"></div>
	</header>

	<form onsubmit={handleSubmit} class="form animate-slide-up">
		<div class="form-group">
			<label for="name">What habit do you want to track?</label>
			<input 
				id="name" 
				type="text" 
				bind:value={name}
				placeholder="e.g., Meditate, Exercise, Read"
				required
			/>
		</div>

		<div class="form-group">
			<label for="description">Description (optional)</label>
			<textarea 
				id="description" 
				bind:value={description}
				placeholder="Why is this habit important?"
				rows="2"
			></textarea>
		</div>

		<div class="form-group">
			<label>How will you measure it?</label>
			<div class="type-grid">
				{#each habitTypes as t}
					<button 
						type="button"
						class="type-card"
						class:selected={type === t.value}
						onclick={() => type = t.value}
					>
						<div class="type-icon">
							<svelte:component this={t.icon} size={24} />
						</div>
						<span class="type-name">{t.label}</span>
						<span class="type-desc">{t.desc}</span>
					</button>
				{/each}
			</div>
		</div>

		{#if type !== 'binary'}
			<div class="form-group animate-fade-in">
				<label for="unit">Unit of measurement</label>
				<input 
					id="unit" 
					type="text" 
					bind:value={unit}
					placeholder="times, glasses, minutes, etc."
				/>
			</div>

			<div class="form-row animate-fade-in">
				<div class="form-group">
					<label for="target">Daily target</label>
					<input 
						id="target" 
						type="number" 
						bind:value={targetValue}
						min="0"
						step="1"
						placeholder="e.g., 30"
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
			{saving ? 'Creating...' : 'Create Habit'}
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

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
	}

	.type-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-3);
	}

	.type-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-4);
		background: var(--color-surface);
		border: 2px solid var(--color-border);
		border-radius: var(--radius-lg);
		cursor: pointer;
		transition: all var(--transition-fast);
		text-align: center;
		color: inherit;
		font: inherit;
	}

	.type-card:hover {
		border-color: var(--color-border-hover);
		background: var(--color-surface-hover);
	}

	.type-card.selected {
		border-color: var(--color-primary);
		background: var(--color-primary-soft);
	}

	.type-icon {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: var(--color-surface-hover);
		color: var(--color-text-secondary);
		transition: all var(--transition-fast);
	}

	.type-card.selected .type-icon {
		background: var(--color-primary);
		color: white;
	}

	.type-name {
		font-weight: 600;
		font-size: 0.875rem;
	}

	.type-desc {
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
