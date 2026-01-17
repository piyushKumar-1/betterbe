<!--
	Profile Page - Analytics & Insights
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { getAllHabits } from '$lib/db/habits';
	import { getAllCheckIns } from '$lib/db/checkins';
	import { generateTextSummary } from '$lib/analytics/summary';
	import { findCorrelations, type Correlation } from '$lib/analytics/heuristics';
	import type { Habit, CheckIn } from '$lib/db/schema';
	import { User, Calendar, Brain, Sparkles, TrendingUp } from 'lucide-svelte';

	let habits = $state<Habit[]>([]);
	let checkIns = $state<CheckIn[]>([]);
	let timeRange = $state<7 | 14 | 30>(7);
	let loading = $state(true);
	
	let summary = $derived(generateTextSummary(habits, checkIns, timeRange));
	let correlations = $derived(findCorrelations(habits, checkIns));

	onMount(async () => {
		try {
			const [h, c] = await Promise.all([
				getAllHabits(),
				getAllCheckIns()
			]);
			habits = h;
			checkIns = c;
		} finally {
			loading = false;
		}
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
				<User size={32} />
			</div>
			<div class="greeting">
				<span class="greeting-text">{getGreeting()}</span>
				<h1>Your Insights</h1>
			</div>
		</div>
	</header>

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
