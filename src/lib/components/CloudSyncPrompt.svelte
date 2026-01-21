<!--
	Social Mode Opt-in Prompt
	Switch from Personal (local) to Social (server) habits
-->
<script lang="ts">
	import { Users, Shield, Smartphone, X, Check } from 'lucide-svelte';
	import { socialModeEnabled, currentUser, enableSocialMode, hasLocalData } from '$lib/data';
	import { isAuthenticated } from '$lib/data/auth-store';
	import MigrationPrompt from './MigrationPrompt.svelte';

	interface Props {
		onClose?: () => void;
		showForSharing?: boolean;
	}

	let { onClose, showForSharing = false }: Props = $props();

	let enabling = $state(false);
	let showMigration = $state(false);
	let error = $state('');

	async function handleEnable() {
		enabling = true;
		error = '';

		try {
			// Check if there's local data to migrate
			const localDataInfo = await hasLocalData();
			
			if (localDataInfo.habits > 0 || localDataInfo.goals > 0) {
				// Show migration prompt if there's local data
				showMigration = true;
			} else {
				// No local data, just enable social mode
				await enableSocialMode();
				onClose?.();
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to enable social mode';
		} finally {
			enabling = false;
		}
	}

	function handleMigrationComplete() {
		showMigration = false;
		onClose?.();
	}

	const benefits = [
		{
			icon: Users,
			title: 'Share Goals',
			desc: 'Collaborate with friends on shared goals'
		},
		{
			icon: Shield,
			title: 'Sync Across Devices',
			desc: 'Access your social habits from any device'
		},
		{
			icon: Smartphone,
			title: 'Keep Personal Separate',
			desc: 'Your personal habits stay private on this device'
		}
	];
</script>

{#if showMigration}
	<MigrationPrompt 
		onClose={() => { showMigration = false; onClose?.(); }}
		onComplete={handleMigrationComplete}
	/>
{:else}

<div class="prompt-backdrop">
	<div class="prompt animate-slide-up">
		<button class="close-btn" onclick={onClose}>
			<X size={20} />
		</button>

		<div class="prompt-header">
			<div class="icon-wrap">
				<Users size={32} />
			</div>
			<h2>
				{#if showForSharing}
					Switch to Social Mode
				{:else}
					Personal vs Social Habits
				{/if}
			</h2>
			<p class="subtitle">
				{#if showForSharing}
					Sharing goals requires social mode.
				{:else}
					Create social habits that can be shared, separate from your personal habits.
				{/if}
			</p>
		</div>

		<div class="benefits">
			{#each benefits as benefit}
				<div class="benefit-item">
					<div class="benefit-icon">
						<svelte:component this={benefit.icon} size={20} />
					</div>
					<div class="benefit-text">
						<span class="benefit-title">{benefit.title}</span>
						<span class="benefit-desc">{benefit.desc}</span>
					</div>
				</div>
			{/each}
		</div>

		<div class="privacy-note">
			<Shield size={16} />
			<span>
				<strong>Your personal habits stay private.</strong> Personal and social habits are completely separate. 
				You can switch between modes anytime.
			</span>
		</div>

		{#if error}
			<p class="error">{error}</p>
		{/if}

		<div class="actions">
			<button class="btn btn-secondary" onclick={onClose}>
				Stay in Personal Mode
			</button>
			<button 
				class="btn btn-primary" 
				onclick={handleEnable}
				disabled={enabling}
			>
				{#if enabling}
					Switching...
				{:else}
					<Check size={18} />
					Enable Social Mode
				{/if}
			</button>
		</div>

		<p class="footer-note">
			Free forever. No credit card required.
		</p>
	</div>
</div>
{/if}

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
		max-width: 400px;
		background: var(--color-surface-solid);
		border-radius: var(--radius-xl);
		padding: var(--space-6);
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

	.prompt-header {
		text-align: center;
		margin-bottom: var(--space-5);
	}

	.icon-wrap {
		width: 64px;
		height: 64px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
		border-radius: 50%;
		color: white;
		margin: 0 auto var(--space-4);
	}

	.prompt-header h2 {
		font-size: 1.25rem;
		margin-bottom: var(--space-2);
	}

	.subtitle {
		color: var(--color-text-muted);
		font-size: 0.9375rem;
	}

	.benefits {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-bottom: var(--space-5);
	}

	.benefit-item {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
	}

	.benefit-icon {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface-hover);
		border-radius: var(--radius-md);
		color: var(--color-primary);
		flex-shrink: 0;
	}

	.benefit-text {
		display: flex;
		flex-direction: column;
	}

	.benefit-title {
		font-weight: 600;
		font-size: 0.9375rem;
	}

	.benefit-desc {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
	}

	.privacy-note {
		display: flex;
		gap: var(--space-2);
		padding: var(--space-3);
		background: var(--color-success-soft);
		border-radius: var(--radius-md);
		font-size: 0.8125rem;
		color: var(--color-success);
		margin-bottom: var(--space-4);
	}

	.privacy-note strong {
		color: inherit;
	}

	.error {
		color: var(--color-error);
		font-size: 0.875rem;
		text-align: center;
		margin-bottom: var(--space-3);
	}

	.actions {
		display: flex;
		gap: var(--space-3);
	}

	.actions .btn {
		flex: 1;
		padding: var(--space-3);
	}

	.footer-note {
		text-align: center;
		font-size: 0.75rem;
		color: var(--color-text-muted);
		margin-top: var(--space-4);
	}
</style>
