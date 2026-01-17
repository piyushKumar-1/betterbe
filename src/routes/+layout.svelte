<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { APP_NAME } from '$lib/config/branding';
	import { Home, BarChart3, Target, Settings } from 'lucide-svelte';

	let { children } = $props();

	// Navigation items with icons
	const navItems = [
		{ href: '/', label: 'Today', icon: Home },
		{ href: '/habits', label: 'Habits', icon: BarChart3 },
		{ href: '/goals', label: 'Goals', icon: Target },
		{ href: '/settings', label: 'Settings', icon: Settings }
	];

	// Check if current route matches
	function isActive(href: string): boolean {
		if (href === '/') {
			return $page.url.pathname === '/';
		}
		return $page.url.pathname.startsWith(href);
	}
</script>

<svelte:head>
	<title>{APP_NAME}</title>
	<meta name="description" content="Analytics-first habit & goal tracker" />
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
	<meta name="theme-color" content="#0a0a0f" />
</svelte:head>

<div class="app">
	<main class="main-content">
		{@render children()}
	</main>

	<nav class="bottom-nav">
		<div class="nav-inner">
			{#each navItems as item}
				<a 
					href={item.href} 
					class="nav-item"
					class:active={isActive(item.href)}
				>
					<span class="nav-icon">
						<item.icon size={22} strokeWidth={isActive(item.href) ? 2.5 : 2} />
					</span>
					<span class="nav-label">{item.label}</span>
					{#if isActive(item.href)}
						<span class="nav-indicator"></span>
					{/if}
				</a>
			{/each}
		</div>
	</nav>
</div>

<style>
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.main-content {
		flex: 1;
		padding-bottom: 90px;
	}

	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 100;
		padding: var(--space-3) var(--space-4);
		padding-bottom: max(var(--space-3), env(safe-area-inset-bottom));
	}

	.nav-inner {
		display: flex;
		justify-content: space-around;
		background: rgba(22, 22, 31, 0.8);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: var(--space-2) var(--space-3);
		max-width: 400px;
		margin: 0 auto;
	}

	.nav-item {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: var(--space-2) var(--space-4);
		color: var(--color-text-muted);
		text-decoration: none;
		transition: all var(--transition-fast);
		border-radius: var(--radius-md);
	}

	.nav-item:hover {
		color: var(--color-text-secondary);
	}

	.nav-item.active {
		color: var(--color-primary);
	}

	.nav-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform var(--transition-bounce);
	}

	.nav-item.active .nav-icon {
		transform: scale(1.1);
	}

	.nav-label {
		font-size: 0.65rem;
		font-weight: 500;
		letter-spacing: 0.02em;
	}

	.nav-indicator {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 4px;
		height: 4px;
		background: var(--color-primary);
		border-radius: var(--radius-full);
		box-shadow: 0 0 8px var(--color-primary);
	}
</style>
