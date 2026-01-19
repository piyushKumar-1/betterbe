<!--
	Authentication Prompt
	
	Clean sign-in UI with Google auth.
-->
<script lang="ts">
	import { X } from 'lucide-svelte';
	import { signInWithGoogle, authLoading, authError } from '$lib/data/auth-store';

	interface Props {
		onClose?: () => void;
		message?: string;
	}

	let { onClose, message = 'Sign in to unlock all features' }: Props = $props();
</script>

<div class="auth-backdrop">
	<div class="auth-modal animate-slide-up">
		<button class="close-btn" onclick={onClose}>
			<X size={20} />
		</button>

		<div class="auth-header">
			<h2>Welcome to BetterBe</h2>
			<p>{message}</p>
		</div>

		{#if $authError}
			<p class="error">{$authError}</p>
		{/if}

		<div class="auth-buttons">
			<button 
				class="auth-btn google"
				onclick={signInWithGoogle}
				disabled={$authLoading}
			>
				<svg viewBox="0 0 24 24" width="20" height="20">
					<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
					<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
					<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
					<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
				</svg>
				{$authLoading ? 'Signing in...' : 'Continue with Google'}
			</button>
		</div>

		<p class="terms">
			By continuing, you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>
		</p>

		<div class="divider">
			<span>or</span>
		</div>

		<button class="skip-btn" onclick={onClose}>
			Continue without account
		</button>

		<p class="skip-note">
			Your data stays private on this device
		</p>
	</div>
</div>

<style>
	.auth-backdrop {
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

	.auth-modal {
		position: relative;
		width: 100%;
		max-width: 380px;
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

	.auth-header {
		text-align: center;
		margin-bottom: var(--space-5);
	}

	.auth-header h2 {
		font-size: 1.375rem;
		margin-bottom: var(--space-2);
	}

	.auth-header p {
		color: var(--color-text-muted);
		font-size: 0.9375rem;
	}

	.error {
		color: var(--color-error);
		font-size: 0.875rem;
		text-align: center;
		margin-bottom: var(--space-4);
		padding: var(--space-3);
		background: rgba(248, 113, 113, 0.1);
		border-radius: var(--radius-md);
	}

	.auth-buttons {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.auth-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		font-size: 0.9375rem;
		font-weight: 500;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.auth-btn:hover {
		background: var(--color-surface-hover);
		border-color: var(--color-border-hover);
	}

	.auth-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.auth-btn.google {
		background: white;
		color: #333;
		border-color: #dadce0;
	}

	.auth-btn.google:hover {
		background: #f8f9fa;
		border-color: #dadce0;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.terms {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		text-align: center;
		margin-top: var(--space-4);
	}

	.terms a {
		color: var(--color-primary);
		text-decoration: none;
	}

	.terms a:hover {
		text-decoration: underline;
	}

	.divider {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin: var(--space-5) 0;
		color: var(--color-text-muted);
		font-size: 0.8125rem;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--color-border);
	}

	.skip-btn {
		width: 100%;
		padding: var(--space-3);
		background: none;
		border: none;
		color: var(--color-text-secondary);
		font-size: 0.9375rem;
		cursor: pointer;
		transition: color var(--transition-fast);
	}

	.skip-btn:hover {
		color: var(--color-text);
	}

	.skip-note {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		text-align: center;
		margin-top: var(--space-2);
	}
</style>
