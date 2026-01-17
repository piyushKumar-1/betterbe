<script lang="ts">
	import { APP_NAME, APP_TAGLINE } from '$lib/config/branding';
	import { exportAsJson, exportAsCsv, importFromJson } from '$lib/export/json';
	import { db } from '$lib/db/schema';
	import { Download, Upload, FileJson, FileSpreadsheet, Cloud, ChevronRight, Shield, AlertCircle, CheckCircle, Trash2 } from 'lucide-svelte';

	let exporting = $state(false);
	let importing = $state(false);
	let importMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);
	let fileInput: HTMLInputElement;
	let showClearConfirm = $state(false);
	let clearing = $state(false);

	async function handleJsonExport() {
		exporting = true;
		try {
			await exportAsJson();
		} finally {
			exporting = false;
		}
	}

	async function handleCsvExport() {
		exporting = true;
		try {
			await exportAsCsv();
		} finally {
			exporting = false;
		}
	}

	function triggerImport() {
		fileInput?.click();
	}

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		importing = true;
		importMessage = null;

		try {
			const result = await importFromJson(file);
			importMessage = {
				type: result.success ? 'success' : 'error',
				text: result.message
			};

			if (result.success) {
				setTimeout(() => window.location.reload(), 1500);
			}
		} finally {
			importing = false;
			input.value = '';
		}
	}

	async function handleClearAllData() {
		clearing = true;
		try {
			await db.transaction('rw', [
				db.habits, db.checkIns, db.checkInContexts,
				db.goals, db.goalHabits, db.successCriteria, db.habitSchedules
			], async () => {
				await db.habits.clear();
				await db.checkIns.clear();
				await db.checkInContexts.clear();
				await db.goals.clear();
				await db.goalHabits.clear();
				await db.successCriteria.clear();
				await db.habitSchedules.clear();
			});
			showClearConfirm = false;
			window.location.reload();
		} catch (err) {
			console.error('Failed to clear data:', err);
		} finally {
			clearing = false;
		}
	}
</script>

<div class="container">
	<header class="header">
		<h1>Settings</h1>
	</header>

	<!-- Data Section -->
	<div class="section-header">Data</div>
	<div class="settings-group">
		<button class="settings-row" onclick={handleJsonExport} disabled={exporting}>
			<FileJson size={22} class="row-icon" />
			<div class="row-content">
				<span class="row-title">Export JSON</span>
				<span class="row-subtitle">Full backup</span>
			</div>
			<Download size={18} class="row-action" />
		</button>
		<button class="settings-row" onclick={handleCsvExport} disabled={exporting}>
			<FileSpreadsheet size={22} class="row-icon" />
			<div class="row-content">
				<span class="row-title">Export CSV</span>
				<span class="row-subtitle">Spreadsheet format</span>
			</div>
			<Download size={18} class="row-action" />
		</button>
		
		<input 
			type="file" 
			accept=".json"
			bind:this={fileInput}
			onchange={handleFileSelect}
			hidden
		/>
		<button class="settings-row" onclick={triggerImport} disabled={importing}>
			<Upload size={22} class="row-icon" />
			<div class="row-content">
				<span class="row-title">{importing ? 'Importing...' : 'Import JSON'}</span>
				<span class="row-subtitle">Restore from backup</span>
			</div>
			<ChevronRight size={18} class="row-action" />
		</button>
	</div>

	{#if importMessage}
		<div class="import-message {importMessage.type}">
			{#if importMessage.type === 'success'}
				<CheckCircle size={18} />
			{:else}
				<AlertCircle size={18} />
			{/if}
			{importMessage.text}
		</div>
	{/if}

	<!-- Sync Section -->
	<div class="section-header">Sync</div>
	<div class="settings-group">
		<div class="settings-row coming-soon">
			<Cloud size={22} class="row-icon" />
			<div class="row-content">
				<span class="row-title">Cloud Sync</span>
				<span class="row-subtitle">End-to-end encrypted</span>
			</div>
			<span class="badge">Soon</span>
		</div>
	</div>

	<!-- Privacy Section -->
	<div class="section-header">Privacy</div>
	<div class="settings-group">
		<div class="settings-row static">
			<Shield size={22} class="row-icon" />
			<div class="row-content">
				<span class="row-title">Your data stays private</span>
				<span class="row-subtitle">Stored locally on device. No tracking.</span>
			</div>
		</div>
	</div>

	<!-- Danger Zone -->
	<div class="section-header danger">Danger Zone</div>
	<div class="settings-group danger">
		<button class="settings-row danger-row" onclick={() => showClearConfirm = true}>
			<Trash2 size={22} class="row-icon danger" />
			<div class="row-content">
				<span class="row-title">Clear All Data</span>
				<span class="row-subtitle">Delete all habits, goals, and check-ins</span>
			</div>
			<ChevronRight size={18} class="row-action" />
		</button>
	</div>

	<!-- About -->
	<div class="about-section">
		<span class="about-icon">📊</span>
		<span class="about-name">{APP_NAME}</span>
		<span class="about-tagline">{APP_TAGLINE}</span>
		<span class="about-version">Version 0.1.0</span>
	</div>
</div>

<!-- Clear Data Confirmation -->
{#if showClearConfirm}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="sheet-backdrop" onclick={() => showClearConfirm = false}>
		<div class="sheet animate-slide-up" onclick={(e) => e.stopPropagation()}>
			<div class="pull-indicator"></div>
			<div class="sheet-content">
				<AlertCircle size={48} style="color: var(--color-error); margin-bottom: var(--space-4);" />
				<h3>Clear All Data?</h3>
				<p>This will permanently delete all your habits, goals, check-ins, and settings. This cannot be undone.</p>
			</div>
			<div class="sheet-actions">
				<button class="btn btn-secondary" onclick={() => showClearConfirm = false}>Cancel</button>
				<button class="btn btn-danger" onclick={handleClearAllData} disabled={clearing}>
					{clearing ? 'Clearing...' : 'Delete Everything'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.header {
		margin-bottom: var(--space-6);
	}

	.section-header {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: var(--space-2) var(--space-1);
		margin-bottom: var(--space-2);
	}

	.settings-group {
		background: var(--color-surface-solid);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-6);
		overflow: hidden;
	}

	.settings-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-4);
		background: none;
		border: none;
		border-bottom: 0.5px solid var(--color-border);
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition: background var(--transition-tap);
	}

	.settings-row:last-child {
		border-bottom: none;
	}

	.settings-row:active:not(.static):not(.coming-soon) {
		background: var(--color-surface-active);
	}

	.settings-row:disabled {
		opacity: 0.5;
	}

	.settings-row.static,
	.settings-row.coming-soon {
		cursor: default;
	}

	.settings-row :global(.row-icon) {
		color: var(--color-primary);
		flex-shrink: 0;
	}

	.row-content {
		flex: 1;
		min-width: 0;
	}

	.row-title {
		display: block;
		font-size: 1rem;
		font-weight: 500;
	}

	.row-subtitle {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
	}

	.settings-row :global(.row-action) {
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.badge {
		padding: var(--space-1) var(--space-2);
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--color-accent);
		background: var(--color-accent-soft);
		border-radius: var(--radius-sm);
	}

	.import-message {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		margin-bottom: var(--space-6);
	}

	.import-message.success {
		background: var(--color-success-soft);
		color: var(--color-success);
	}

	.import-message.error {
		background: rgba(248, 113, 113, 0.1);
		color: var(--color-error);
	}

	.about-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: var(--space-8) var(--space-4);
	}

	.about-icon {
		font-size: 2.5rem;
		margin-bottom: var(--space-2);
	}

	.about-name {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-primary);
	}

	.about-tagline {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		margin-bottom: var(--space-2);
	}

	.about-version {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	/* Danger Zone */
	.section-header.danger {
		color: var(--color-error);
	}

	.settings-group.danger {
		border: 1px solid rgba(248, 113, 113, 0.2);
	}

	.settings-row :global(.row-icon.danger) {
		color: var(--color-error);
	}

	/* Sheet */
	.sheet-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		z-index: 2000;
		display: flex;
		align-items: flex-end;
	}

	.sheet {
		width: 100%;
		background: var(--color-surface-solid);
		border-radius: var(--radius-xl) var(--radius-xl) 0 0;
		padding: var(--space-2) var(--space-4) var(--space-4);
		padding-bottom: calc(var(--space-4) + var(--safe-bottom));
	}

	.sheet-content {
		text-align: center;
		padding: var(--space-4);
	}

	.sheet-content h3 {
		margin-bottom: var(--space-2);
	}

	.sheet-content p {
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	.sheet-actions {
		display: flex;
		gap: var(--space-3);
	}

	.sheet-actions .btn {
		flex: 1;
	}

	.btn-danger {
		background: var(--color-error);
		color: white;
	}

	.pull-indicator {
		width: 36px;
		height: 5px;
		background: var(--color-border);
		border-radius: var(--radius-full);
		margin: var(--space-2) auto var(--space-4);
	}
</style>
