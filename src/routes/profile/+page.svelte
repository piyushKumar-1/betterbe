<!--
	Profile Page - Analytics & Insights with Data Source Tabs
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { getActiveHabits, getAllHabits } from '$lib/data/habits';
	import { getAllCheckIns } from '$lib/data/checkins';
	import { generateTextSummary } from '$lib/analytics/summary';
	import { findCorrelations, type Correlation } from '$lib/analytics/heuristics';
	import type { Habit, CheckIn } from '$lib/db/schema';
	import { User, Calendar, Brain, Sparkles, TrendingUp, Smartphone, Users, RefreshCw } from 'lucide-svelte';
	import { currentUser, socialModeEnabled, getDataLayer } from '$lib/data';
	import { isAuthenticated } from '$lib/data/auth-store';
	import { localData } from '$lib/data/local';
	import { remoteData } from '$lib/data/remote';

	let habits = $state<Habit[]>([]);
	let checkIns = $state<CheckIn[]>([]);
	let timeRange = $state<7 | 14 | 30>(7);
	let loading = $state(true);
	let habitMode = $state<'personal' | 'social'>('personal');
	let refreshing = $state(false);
	
	let summary = $derived(generateTextSummary(habits, checkIns, timeRange));
	let correlations = $derived(findCorrelations(habits, checkIns));

	// Determine current habit mode - when social mode is enabled, ONLY use server
	let currentHabitMode = $derived(
		$isAuthenticated && $socialModeEnabled ? 'social' : 'personal'
	);

	// Update habit mode when auth/social mode state changes
	$effect(() => {
		const newMode = $isAuthenticated && $socialModeEnabled ? 'social' : 'personal';
		if (newMode !== habitMode) {
			habitMode = newMode;
			loadData();
		}
	});

	// When social mode is enabled, force social mode (hide personal habits)
	$effect(() => {
		if ($isAuthenticated && $socialModeEnabled && habitMode === 'personal') {
			habitMode = 'social';
			loadData();
		}
	});

	async function loadData() {
		loading = true;
		try {
			let h: Habit[];
			let c: CheckIn[];

			if (habitMode === 'social' && $isAuthenticated && $socialModeEnabled) {
				// Load social habits from server
				h = await remoteData.getActiveHabits();
				// Get check-ins for all social habits
				c = [];
				for (const habit of h) {
					const checkIns = await remoteData.getCheckInsForHabit(habit.id);
					c.push(...checkIns);
				}
			} else {
				// Load personal habits from local
				h = await getAllHabits();
				c = await getAllCheckIns();
			}

			habits = h;
			checkIns = c;
		} catch (err) {
			console.error('Failed to load data:', err);
		} finally {
			loading = false;
		}
	}

	async function switchHabitMode(newMode: 'personal' | 'social') {
		if (newMode === 'social' && (!$isAuthenticated || !$socialModeEnabled)) {
			// Can't switch to social if not logged in or social mode not enabled
			return;
		}
		
		// When social mode is enabled, prevent switching to personal (personal habits are hidden)
		if (newMode === 'personal' && $isAuthenticated && $socialModeEnabled) {
			// Can't view personal habits when in social mode
			return;
		}
		
		habitMode = newMode;
		await loadData();
	}

	async function refreshData() {
		refreshing = true;
		try {
			await loadData();
		} finally {
			refreshing = false;
		}
	}

	onMount(() => {
		loadData();
	});

	function getGreeting(): string {
		const hour = new Date().getHours();
		if (hour < 12) return 'Good morning';
		if (hour < 18) return 'Good afternoon';
		return 'Good evening';
	}
</script>

<div class="container animate-fade-in">
	<header class="header">
		<div class="profile-header">
			<div class="avatar">
				{#if $isAuthenticated && $currentUser}
					{#if $currentUser.avatarUrl}
						<img src={$currentUser.avatarUrl} alt={$currentUser.name || 'Avatar'} />
					{:else}
						<User size={32} />
					{/if}
				{:else}
					<User size={32} />
				{/if}
			</div>
			<div class="greeting">
				<span class="greeting-text">{getGreeting()}</span>
				<h1>
					{#if $isAuthenticated && $currentUser}
						{$currentUser.name || 'Your'} Insights
					{:else}
						Your Insights
					{/if}
				</h1>
			</div>
		</div>
	</header>

	<!-- Habit Mode Tabs -->
	<div class="data-source-tabs">
		<button 
			class="source-tab" 
			class:active={habitMode === 'personal'}
			class:disabled={$isAuthenticated && $socialModeEnabled}
			onclick={() => switchHabitMode('personal')}
			disabled={$isAuthenticated && $socialModeEnabled}
		>
			<Smartphone size={18} />
			<span>Personal</span>
			{#if habitMode === 'personal' && (!$isAuthenticated || !$socialModeEnabled)}
				<span class="badge">Active</span>
			{/if}
		</button>
		<button 
			class="source-tab" 
			class:active={habitMode === 'social'}
			class:disabled={!$isAuthenticated || !$socialModeEnabled}
			onclick={() => switchHabitMode('social')}
			disabled={!$isAuthenticated || !$socialModeEnabled}
		>
			<Users size={18} />
			<span>Social</span>
			{#if habitMode === 'social' && $isAuthenticated && $socialModeEnabled}
				<span class="badge">Active</span>
			{/if}
		</button>
		{#if habitMode === 'social'}
			<button class="refresh-btn" onclick={refreshData} disabled={refreshing}>
				<span class:spinning={refreshing}>
					<RefreshCw size={16} />
				</span>
			</button>
		{/if}
	</div>

	{#if $isAuthenticated && $socialModeEnabled}
		<div class="info-banner server-mode">
			<Users size={18} />
			<div>
				<strong>Social Mode Active</strong>
				<p>Viewing social habits. Personal habits are hidden and remain on your device.</p>
			</div>
		</div>
	{:else if !$isAuthenticated || !$socialModeEnabled}
		<div class="info-banner">
			<Smartphone size={18} />
			<div>
				<strong>Personal Habits</strong>
				<p>
					{#if !$isAuthenticated}
						Sign in and enable social mode to create shareable habits
					{:else}
						Enable social mode in Settings to create shareable habits
					{/if}
				</p>
			</div>
		</div>
	{/if}

	<div class="tabs">
		<button 
			class="tab-btn" 
			class:active={timeRange === 7} 
			onclick={() => timeRange = 7}
		>7 Days</button>
		<button 
			class="tab-btn" 
			class:active={timeRange === 14} 
			onclick={() => timeRange = 14}
		>14 Days</button>
		<button 
			class="tab-btn" 
			class:active={timeRange === 30} 
			onclick={() => timeRange = 30}
		>30 Days</button>
	</div>

	{#if loading}
		<div class="loading-state">
			<div class="skeleton" style="height: 120px; width: 100%; margin-bottom: 24px;"></div>
			<div class="skeleton" style="height: 80px; width: 100%;"></div>
		</div>
	{:else}
		<!-- AI Summary Card -->
		<section class="section animate-slide-up">
			<div class="card summary-card">
				<div class="card-header">
					<Sparkles class="icon-sparkle" size={20} />
					<h2>Performance Summary</h2>
				</div>
				<p class="summary-text">{summary}</p>
			</div>
		</section>

		<!-- Heuristics / Correlations -->
		{#if correlations.length > 0}
			<section class="section animate-slide-up" style="animation-delay: 100ms">
				<div class="section-title">
					<Brain size={18} />
					<h3>Habit Connections</h3>
				</div>
				<div class="correlations-list">
					{#each correlations as corr}
						<div class="card correlation-card">
							<div class="correlation-header">
								<span class="correlation-names">
									{corr.habitAName} &rarr; {corr.habitBName}
								</span>
								<span class="correlation-score">
									<TrendingUp size={14} />
									Strong Link
								</span>
							</div>
							<p class="correlation-desc">{corr.description}</p>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Stats Grid -->
		<section class="section animate-slide-up" style="animation-delay: 200ms">
			<div class="stats-grid">
				<div class="stat-box">
					<span class="stat-label">Total Habits</span>
					<span class="stat-number">{habits.length}</span>
				</div>
				<div class="stat-box">
					<span class="stat-label">Check-ins</span>
					<span class="stat-number">{checkIns.length}</span>
				</div>
			</div>
		</section>
	{/if}
</div>

<style>
	.container {
		padding-bottom: 100px;
	}

	.header {
		margin-bottom: var(--space-6);
	}

	.profile-header {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}

	.avatar {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--color-surface-hover);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-primary);
		overflow: hidden;
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.greeting {
		display: flex;
		flex-direction: column;
	}

	.greeting-text {
		font-size: 0.875rem;
		color: var(--color-text-muted);
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	/* Data Source Tabs */
	.data-source-tabs {
		display: flex;
		background: var(--color-surface-solid);
		padding: 4px;
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-4);
		gap: 4px;
		position: relative;
	}

	.source-tab {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border: none;
		background: none;
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: all var(--transition-fast);
		position: relative;
	}

	.source-tab:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.source-tab.active {
		background: var(--color-surface);
		color: var(--color-text);
		box-shadow: 0 1px 2px rgba(0,0,0,0.1);
	}

	.source-tab .badge {
		position: absolute;
		top: -4px;
		right: -4px;
		background: var(--color-primary);
		color: white;
		font-size: 0.625rem;
		padding: 2px 6px;
		border-radius: var(--radius-full);
		font-weight: 600;
	}

	.refresh-btn {
		position: absolute;
		right: var(--space-2);
		top: 50%;
		transform: translateY(-50%);
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface-hover);
		border: none;
		border-radius: var(--radius-md);
		color: var(--color-text-muted);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.refresh-btn:hover:not(:disabled) {
		background: var(--color-surface-active);
		color: var(--color-text);
	}

	.refresh-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.spinning {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.info-banner {
		display: flex;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		background: var(--color-surface-hover);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-4);
		color: var(--color-text-muted);
	}

	.info-banner.server-mode {
		background: var(--color-primary-soft);
		color: var(--color-primary);
	}

	.info-banner strong {
		display: block;
		color: var(--color-text);
		margin-bottom: var(--space-1);
	}

	.info-banner p {
		font-size: 0.8125rem;
		margin: 0;
	}

	.tabs {
		display: flex;
		background: var(--color-surface-solid);
		padding: 4px;
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-6);
	}

	.tab-btn {
		flex: 1;
		padding: 8px;
		border: none;
		background: none;
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.tab-btn.active {
		background: var(--color-surface);
		color: var(--color-text);
		box-shadow: 0 1px 2px rgba(0,0,0,0.1);
	}

	.section {
		margin-bottom: var(--space-6);
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
		color: var(--color-text-muted);
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.card {
		background: var(--color-surface-solid);
		border-radius: var(--radius-xl);
		padding: var(--space-5);
	}

	.summary-card {
		background: linear-gradient(135deg, var(--color-surface-solid), var(--color-surface-hover));
		border: 1px solid var(--color-border);
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
		color: var(--color-primary);
	}

	.card-header h2 {
		font-size: 1.125rem;
		font-weight: 600;
	}

	.summary-text {
		line-height: 1.6;
		color: var(--color-text);
	}

	.correlation-card {
		margin-bottom: var(--space-3);
	}

	.correlation-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-2);
	}

	.correlation-names {
		font-weight: 600;
		font-size: 0.9375rem;
	}

	.correlation-score {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.75rem;
		color: var(--color-success);
		background: rgba(34, 197, 94, 0.1);
		padding: 2px 8px;
		border-radius: var(--radius-full);
	}

	.correlation-desc {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		line-height: 1.5;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
	}

	.stat-box {
		background: var(--color-surface-solid);
		padding: var(--space-4);
		border-radius: var(--radius-lg);
		text-align: center;
	}

	.stat-label {
		display: block;
		font-size: 0.75rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
		margin-bottom: var(--space-1);
	}

	.stat-number {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-primary);
	}

	.icon-sparkle {
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0% { opacity: 0.5; transform: scale(1); }
		50% { opacity: 1; transform: scale(1.1); }
		100% { opacity: 0.5; transform: scale(1); }
	}
</style>
