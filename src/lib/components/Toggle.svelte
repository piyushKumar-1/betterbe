<!--
	Reusable Toggle Switch Component
	
	Usage:
	<Toggle bind:checked={value} label="Enable feature" />
	<Toggle bind:checked={value} /> (no label, just toggle)
-->
<script lang="ts">
	interface Props {
		checked?: boolean;
		label?: string;
		disabled?: boolean;
	}

	let { checked = $bindable(false), label = '', disabled = false }: Props = $props();
</script>

{#if label}
	<label class="toggle-row" class:disabled>
		<span class="toggle-label">{label}</span>
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			class="toggle"
			class:checked
			{disabled}
			onclick={() => !disabled && (checked = !checked)}
		>
			<span class="toggle-knob"></span>
		</button>
	</label>
{:else}
	<button
		type="button"
		role="switch"
		aria-checked={checked}
		class="toggle"
		class:checked
		{disabled}
		onclick={() => !disabled && (checked = !checked)}
	>
		<span class="toggle-knob"></span>
	</button>
{/if}

<style>
	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		background: var(--color-surface);
		border-radius: var(--radius-md);
		cursor: pointer;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
	}

	.toggle-row.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.toggle-label {
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--color-text);
	}

	.toggle {
		position: relative;
		width: 51px;
		height: 31px;
		padding: 0;
		background: var(--color-surface-hover);
		border: none;
		border-radius: 15.5px;
		cursor: pointer;
		transition: background-color 0.2s ease;
		flex-shrink: 0;
		-webkit-tap-highlight-color: transparent;
	}

	.toggle:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.toggle.checked {
		background: var(--color-primary);
	}

	.toggle:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.toggle-knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 27px;
		height: 27px;
		background: white;
		border-radius: 50%;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		transition: transform 0.2s ease;
		pointer-events: none;
	}

	.toggle.checked .toggle-knob {
		transform: translateX(20px);
	}

	/* Active state feedback */
	.toggle:active .toggle-knob {
		width: 30px;
	}

	.toggle.checked:active .toggle-knob {
		width: 30px;
		transform: translateX(17px);
	}
</style>

