<!--
	Google OAuth Callback Handler
	Extracts the authorization code and exchanges it for tokens
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { handleGoogleCallback } from '$lib/data/auth-store';
	import { RefreshCw } from 'lucide-svelte';

	let error = $state<string | null>(null);
	let loading = $state(true);

	onMount(async () => {
		try {
			// Extract code from URL query params
			const code = $page.url.searchParams.get('code');
			const errorParam = $page.url.searchParams.get('error');

			if (errorParam) {
				error = `OAuth error: ${errorParam}`;
				loading = false;
				setTimeout(() => goto('/settings'), 3000);
				return;
			}

			if (!code) {
				error = 'No authorization code received';
				loading = false;
				setTimeout(() => goto('/settings'), 3000);
				return;
			}

			// Exchange code for tokens
			await handleGoogleCallback(code);

			// Redirect to settings page on success
			goto('/settings');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to complete sign in';
			loading = false;
			setTimeout(() => goto('/settings'), 3000);
		}
	});
</script>

<div class="callback-container">
	{#if loading}
		<div class="loading-state">
			<RefreshCw size={48} class="spinner" />
			<p>Completing sign in...</p>
		</div>
	{:else if error}
		<div class="error-state">
			<p class="error-text">{error}</p>
			<p class="redirect-note">Redirecting to settings...</p>
		</div>
	{/if}
</div>

<style>
	.callback-container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: var(--space-4);
	}

	.loading-state,
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		text-align: center;
	}

	.spinner {
		color: var(--color-primary);
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.error-text {
		color: var(--color-error);
		font-size: 1rem;
	}

	.redirect-note {
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}
</style>

