<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { APP_NAME } from '$lib/config/branding';
	import { Home, BarChart3, Target, Settings, User } from 'lucide-svelte';
	import { socialModeEnabled } from '$lib/data';

	let { children } = $props();

	// Navigation items with icons
	const navItems = [
		{ href: '/', label: 'Today', icon: Home },
		{ href: '/habits', label: 'Habits', icon: BarChart3 },
		{ href: '/goals', label: 'Goals', icon: Target },
		{ href: '/profile', label: 'Profile', icon: User },
		{ href: '/settings', label: 'Settings', icon: Settings }
	];

	// Check if current route matches
	function isActive(href: string): boolean {
		const path = $page.url.pathname.replace(base, '');
		if (href === '/') {
			return path === '/' || path === '';
		}
		return path.startsWith(href);
	}
</script>

<svelte:head>
	<title>{APP_NAME}</title>
	<meta name="description" content="Analytics-first habit & goal tracker" />
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
	<meta name="theme-color" content="#0a0a0f" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
	<meta name="mobile-web-app-capable" content="yes" />
</svelte:head>

<div class="app">
	<main class="main-content">
		<div class="page-wrapper">
			{@render children()}
		</div>
	</main>

	<!-- iOS-style Tab Bar -->
	<nav class="tab-bar">
		<!-- Mode indicator bar on top -->
		{#if $socialModeEnabled}
			<div class="mode-bar">
				<span>Social Mode</span>
			</div>
		{/if}
		
		<div class="tab-items">
			{#each navItems as item}
				<a 
					href="{base}{item.href}" 
					class="tab-item"
					class:active={isActive(item.href)}
				>
					<span class="tab-icon">
						<item.icon size={24} strokeWidth={isActive(item.href) ? 2.5 : 1.5} />
					</span>
					<span class="tab-label">{item.label}</span>
				</a>
			{/each}
		</div>
	</nav>
</div>

<style>
	.app {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		background: var(--color-bg);
	}

	.main-content {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		-webkit-overflow-scrolling: touch;
		overscroll-behavior-y: contain;
	}

	.page-wrapper {
		min-height: 100%;
		padding-bottom: calc(100px + var(--safe-bottom));
	}

	/* iOS-style Tab Bar */
	.tab-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		flex-direction: column;
		background: rgba(20, 20, 25, 0.92);
		backdrop-filter: saturate(180%) blur(20px);
		-webkit-backdrop-filter: saturate(180%) blur(20px);
		border-top: 0.5px solid rgba(255, 255, 255, 0.1);
		z-index: 1000;
	}

	/* Mode indicator bar */
	.mode-bar {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 3px 0;
		background: var(--color-primary);
		font-size: 0.5rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.9);
		opacity: 0.85;
	}

	.tab-items {
		display: flex;
		justify-content: space-around;
		padding-top: var(--space-2);
		padding-bottom: max(var(--space-2), var(--safe-bottom));
	}

	.tab-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: var(--space-1) 0;
		color: var(--color-text-muted);
		text-decoration: none;
		transition: color var(--transition-fast);
		-webkit-tap-highlight-color: transparent;
	}

	.tab-item:active {
		opacity: 0.7;
	}

	.tab-item.active {
		color: var(--color-primary);
	}

	.tab-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
	}

	.tab-label {
		font-size: 0.625rem;
		font-weight: 500;
		letter-spacing: 0.01em;
	}
</style>
