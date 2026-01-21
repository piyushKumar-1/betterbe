<!--
	Migration Prompt - Select which local habits/goals to migrate to social mode
-->
<script lang="ts">
	import { X, Check, Target, Repeat, ArrowRight, Loader2 } from 'lucide-svelte';
	import { getLocalDataForMigration, migrateSelectedToCloud, enableSocialMode } from '$lib/data';

	interface Props {
		onClose?: () => void;
		onComplete?: () => void;
	}

	let { onClose, onComplete }: Props = $props();

	let loading = $state(true);
	let migrating = $state(false);
	let error = $state('');
	
	let habits = $state<Array<{ id: string; name: string; type: string }>>([]);
	let goals = $state<Array<{ id: string; name: string; deadline: string }>>([]);
	
	let selectedHabitIds = $state<Set<string>>(new Set());
	let selectedGoalIds = $state<Set<string>>(new Set());

	// Load local data on mount
	import { onMount } from 'svelte';
	onMount(async () => {
		try {
			const data = await getLocalDataForMigration();
			habits = data.habits;
			goals = data.goals;
			// Pre-select all items by default
			selectedHabitIds = new Set(data.habits.map(h => h.id));
			selectedGoalIds = new Set(data.goals.map(g => g.id));
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load data';
		} finally {
			loading = false;
		}
	});

	function toggleHabit(id: string) {
		const newSet = new Set(selectedHabitIds);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedHabitIds = newSet;
	}

	function toggleGoal(id: string) {
		const newSet = new Set(selectedGoalIds);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedGoalIds = newSet;
	}

	function selectAll() {
		selectedHabitIds = new Set(habits.map(h => h.id));
		selectedGoalIds = new Set(goals.map(g => g.id));
	}

	function selectNone() {
		selectedHabitIds = new Set();
		selectedGoalIds = new Set();
	}

	async function handleMigrate() {
		migrating = true;
		error = '';

		try {
			// Enable social mode first
			await enableSocialMode();
			
			// Migrate selected items if any
			if (selectedHabitIds.size > 0 || selectedGoalIds.size > 0) {
				await migrateSelectedToCloud(
					Array.from(selectedHabitIds),
					Array.from(selectedGoalIds)
				);
			}
			
			onComplete?.();
			onClose?.();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Migration failed';
		} finally {
			migrating = false;
		}
	}

	async function handleSkipMigration() {
		migrating = true;
		error = '';

		try {
			// Just enable social mode without migrating anything
			await enableSocialMode();
			onComplete?.();
			onClose?.();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to enable social mode';
		} finally {
			migrating = false;
		}
	}

	const hasItems = $derived(habits.length > 0 || goals.length > 0);
	const selectedCount = $derived(selectedHabitIds.size + selectedGoalIds.size);
	const totalCount = $derived(habits.length + goals.length);
</script>

<div class="prompt-backdrop">
	<div class="prompt animate-slide-up">
		<button class="close-btn" onclick={onClose} disabled={migrating}>
			<X size={20} />
		</button>

		<div class="prompt-header">
			<div class="icon-wrap">
				<ArrowRight size={28} />
			</div>
			<h2>Migrate to Social Mode</h2>
			<p class="subtitle">
				Choose which items to move to the server. Unselected items will stay in local mode only.
			</p>
		</div>

		{#if loading}
			<div class="loading-state">
				<Loader2 size={24} class="spinning" />
				<span>Loading your data...</span>
			</div>
		{:else if !hasItems}
			<div class="empty-state">
				<p>No local data to migrate. You can start fresh in social mode!</p>
			</div>
		{:else}
			<div class="selection-header">
				<span class="selection-count">{selectedCount} of {totalCount} selected</span>
				<div class="selection-actions">
					<button class="link-btn" onclick={selectAll}>Select All</button>
					<span class="divider">|</span>
					<button class="link-btn" onclick={selectNone}>Select None</button>
				</div>
			</div>

			{#if habits.length > 0}
				<div class="section">
					<div class="section-header">
						<Repeat size={16} />
						<span>Habits ({habits.length})</span>
					</div>
					<div class="items-list">
						{#each habits as habit (habit.id)}
							<button 
								class="item-row" 
								class:selected={selectedHabitIds.has(habit.id)}
								onclick={() => toggleHabit(habit.id)}
							>
								<div class="checkbox" class:checked={selectedHabitIds.has(habit.id)}>
									{#if selectedHabitIds.has(habit.id)}
										<Check size={14} strokeWidth={3} />
									{/if}
								</div>
								<span class="item-name">{habit.name}</span>
								<span class="item-type">{habit.type}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			{#if goals.length > 0}
				<div class="section">
					<div class="section-header">
						<Target size={16} />
						<span>Goals ({goals.length})</span>
					</div>
					<div class="items-list">
						{#each goals as goal (goal.id)}
							<button 
								class="item-row" 
								class:selected={selectedGoalIds.has(goal.id)}
								onclick={() => toggleGoal(goal.id)}
							>
								<div class="checkbox" class:checked={selectedGoalIds.has(goal.id)}>
									{#if selectedGoalIds.has(goal.id)}
										<Check size={14} strokeWidth={3} />
									{/if}
								</div>
								<span class="item-name">{goal.name}</span>
								<span class="item-deadline">{goal.deadline}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		{/if}

		{#if error}
			<p class="error">{error}</p>
		{/if}

		<div class="actions">
			{#if hasItems}
				<button class="btn btn-secondary" onclick={handleSkipMigration} disabled={migrating}>
					Skip Migration
				</button>
				<button 
					class="btn btn-primary" 
					onclick={handleMigrate}
					disabled={migrating}
				>
					{#if migrating}
						<Loader2 size={18} class="spinning" />
						Migrating...
					{:else}
						<Check size={18} />
						Migrate {selectedCount > 0 ? `(${selectedCount})` : ''}
					{/if}
				</button>
			{:else}
				<button 
					class="btn btn-primary full-width" 
					onclick={handleSkipMigration}
					disabled={migrating}
				>
					{#if migrating}
						<Loader2 size={18} class="spinning" />
						Enabling...
					{:else}
						Continue to Social Mode
					{/if}
				</button>
			{/if}
		</div>

		<p class="footer-note">
			Items left in local mode will only be visible when you switch back to personal mode.
		</p>
	</div>
</div>

<style>
	.prompt-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		z-index: 2000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-4);
	}

	.prompt {
		position: relative;
		width: 100%;
		max-width: 440px;
		max-height: 80vh;
		background: var(--color-surface-solid);
		border-radius: var(--radius-xl);
		padding: var(--space-5);
		overflow-y: auto;
	}

	.close-btn {
		position: absolute;
		top: var(--space-4);
		right: var(--space-4);
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface-hover);
		border: none;
		border-radius: 50%;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.close-btn:hover {
		background: var(--color-surface-active);
		color: var(--color-text);
	}

	.close-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.prompt-header {
		text-align: center;
		margin-bottom: var(--space-4);
	}

	.icon-wrap {
		width: 56px;
		height: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
		border-radius: 50%;
		color: white;
		margin: 0 auto var(--space-3);
	}

	.prompt-header h2 {
		font-size: 1.125rem;
		margin-bottom: var(--space-2);
	}

	.subtitle {
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-3);
		padding: var(--space-6) var(--space-4);
		color: var(--color-text-muted);
	}

	.selection-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-2) var(--space-1);
		margin-bottom: var(--space-2);
	}

	.selection-count {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
	}

	.selection-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.link-btn {
		background: none;
		border: none;
		color: var(--color-primary);
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		padding: 0;
	}

	.link-btn:hover {
		text-decoration: underline;
	}

	.divider {
		color: var(--color-text-muted);
		font-size: 0.75rem;
	}

	.section {
		margin-bottom: var(--space-4);
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: var(--space-2) 0;
	}

	.items-list {
		background: var(--color-surface-hover);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.item-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-3);
		background: none;
		border: none;
		border-bottom: 0.5px solid var(--color-border);
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition: background var(--transition-fast);
	}

	.item-row:last-child {
		border-bottom: none;
	}

	.item-row:hover {
		background: var(--color-surface-active);
	}

	.item-row.selected {
		background: var(--color-primary-soft);
	}

	.checkbox {
		width: 22px;
		height: 22px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface-solid);
		border: 2px solid var(--color-border);
		border-radius: var(--radius-sm);
		flex-shrink: 0;
		transition: all var(--transition-fast);
	}

	.checkbox.checked {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
	}

	.item-name {
		flex: 1;
		font-weight: 500;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-type,
	.item-deadline {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		text-transform: capitalize;
	}

	.error {
		color: var(--color-error);
		font-size: 0.875rem;
		text-align: center;
		margin: var(--space-3) 0;
	}

	.actions {
		display: flex;
		gap: var(--space-3);
		margin-top: var(--space-4);
	}

	.actions .btn {
		flex: 1;
		padding: var(--space-3);
	}

	.actions .btn.full-width {
		flex: none;
		width: 100%;
	}

	.footer-note {
		text-align: center;
		font-size: 0.75rem;
		color: var(--color-text-muted);
		margin-top: var(--space-4);
	}

	:global(.spinning) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
