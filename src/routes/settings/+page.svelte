<script lang="ts">
	import { APP_NAME, APP_TAGLINE } from '$lib/config/branding';
	import { exportAsJson, exportAsCsv, importFromJson } from '$lib/export/json';
	import { db } from '$lib/db/schema';
	import { 
		Download, Upload, FileJson, FileSpreadsheet, Cloud, ChevronRight, 
		Shield, AlertCircle, CheckCircle, Trash2, LogOut, User, 
		Smartphone, Server, RefreshCw, X
	} from 'lucide-svelte';
	import { Toggle } from '$lib/components';
	import { 
		currentUser, cloudSyncEnabled, enableCloudSync, disableCloudSync,
		syncLocalToCloud, syncCloudToLocal
	} from '$lib/data';
	import { isAuthenticated, signOut, authLoading } from '$lib/data/auth-store';
	import AuthPrompt from '$lib/components/AuthPrompt.svelte';
	import CloudSyncPrompt from '$lib/components/CloudSyncPrompt.svelte';

	let exporting = $state(false);
	let importing = $state(false);
	let syncing = $state(false);
	let importMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);
	let syncMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);
	let fileInput: HTMLInputElement;
	let showClearConfirm = $state(false);
	let clearing = $state(false);
	let showAuthPrompt = $state(false);
	let showCloudPrompt = $state(false);

	// Storage mode: 'local' or 'cloud'
	let storageMode = $derived($cloudSyncEnabled ? 'cloud' : 'local');

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

	async function handleSignOut() {
		await signOut();
	}

	function handleStorageModeChange() {
		if (!$isAuthenticated) {
			// Need to sign in first
			showAuthPrompt = true;
			return;
		}

		if ($cloudSyncEnabled) {
			// Disable cloud sync
			handleDisableCloud();
		} else {
			// Enable cloud sync
			showCloudPrompt = true;
		}
	}

	async function handleDisableCloud() {
		try {
			await disableCloudSync();
			syncMessage = {
				type: 'success',
				text: 'Cloud sync disabled. Your data stays on this device.'
			};
		} catch (e) {
			syncMessage = {
				type: 'error',
				text: e instanceof Error ? e.message : 'Failed to disable cloud sync'
			};
		}
	}

	async function handleSyncNow() {
		if (!$isAuthenticated || !$cloudSyncEnabled) return;

		syncing = true;
		syncMessage = null;

		try {
			const result = await syncLocalToCloud();
			syncMessage = {
				type: 'success',
				text: `Synced ${result.habits} habits, ${result.checkins} check-ins, ${result.goals} goals`
			};
		} catch (e) {
			syncMessage = {
				type: 'error',
				text: e instanceof Error ? e.message : 'Sync failed'
			};
		} finally {
			syncing = false;
		}
	}
</script>

<div class="container">
	<header class="header">
		<h1>Settings</h1>
	</header>

	<!-- Account Section -->
	<div class="section-header">Account</div>
	<div class="settings-group">
		{#if $isAuthenticated && $currentUser}
			<div class="settings-row account-row">
				<div class="avatar">
					{#if $currentUser.avatarUrl}
						<img src={$currentUser.avatarUrl} alt={$currentUser.name || 'Avatar'} />
					{:else}
						<User size={24} />
					{/if}
				</div>
				<div class="row-content">
					<span class="row-title">{$currentUser.name || $currentUser.email}</span>
					<span class="row-subtitle">{$currentUser.email}</span>
				</div>
			</div>
			<button class="settings-row" onclick={handleSignOut} disabled={$authLoading}>
				<LogOut size={22} class="row-icon logout" />
				<div class="row-content">
					<span class="row-title">Sign Out</span>
					<span class="row-subtitle">Keep your data locally</span>
				</div>
				<ChevronRight size={18} class="row-action" />
			</button>
		{:else}
			<button class="settings-row" onclick={() => showAuthPrompt = true}>
				<User size={22} class="row-icon" />
				<div class="row-content">
					<span class="row-title">Sign In</span>
					<span class="row-subtitle">Sync across devices & share goals</span>
				</div>
				<ChevronRight size={18} class="row-action" />
			</button>
		{/if}
	</div>

	<!-- Storage Mode Section -->
	<div class="section-header">Data Storage</div>
	<div class="settings-group">
		<div class="storage-selector">
			<button 
				class="storage-option" 
				class:active={storageMode === 'local'}
				onclick={storageMode === 'cloud' ? handleStorageModeChange : undefined}
			>
				<div class="storage-icon">
					<Smartphone size={24} />
				</div>
				<div class="storage-info">
					<span class="storage-title">Local Only</span>
					<span class="storage-desc">Data stays on this device</span>
				</div>
				{#if storageMode === 'local'}
					<div class="storage-check">
						<CheckCircle size={20} />
					</div>
				{/if}
			</button>
			
			<button 
				class="storage-option" 
				class:active={storageMode === 'cloud'}
				onclick={storageMode === 'local' ? handleStorageModeChange : undefined}
			>
				<div class="storage-icon cloud">
					<Server size={24} />
				</div>
				<div class="storage-info">
					<span class="storage-title">Cloud Backup</span>
					<span class="storage-desc">Sync & share across devices</span>
				</div>
				{#if storageMode === 'cloud'}
					<div class="storage-check">
						<CheckCircle size={20} />
					</div>
				{/if}
			</button>
		</div>

		{#if $cloudSyncEnabled && $isAuthenticated}
			<button class="settings-row sync-row" onclick={handleSyncNow} disabled={syncing}>
				<span class="row-icon" class:spinning={syncing}>
					<RefreshCw size={22} />
				</span>
				<div class="row-content">
					<span class="row-title">{syncing ? 'Syncing...' : 'Sync Now'}</span>
					<span class="row-subtitle">Push local changes to cloud</span>
				</div>
				<ChevronRight size={18} class="row-action" />
			</button>
		{/if}
	</div>

	{#if syncMessage}
		<div class="sync-message {syncMessage.type}">
			{#if syncMessage.type === 'success'}
				<CheckCircle size={18} />
			{:else}
				<AlertCircle size={18} />
			{/if}
			{syncMessage.text}
		</div>
	{/if}

	<!-- Privacy Note -->
	<div class="privacy-card">
		<Shield size={20} />
		<div>
			<strong>Your data, your choice</strong>
			<p>
				{#if storageMode === 'local'}
					All data stays privately on your device. Nothing is sent to our servers.
				{:else}
					Data is encrypted and synced to enable backup & sharing. You can switch back to local-only anytime.
				{/if}
			</p>
		</div>
	</div>

	<!-- Data Section -->
	<div class="section-header">Export & Import</div>
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

<!-- Auth Prompt Modal -->
{#if showAuthPrompt}
	<AuthPrompt 
		onClose={() => showAuthPrompt = false}
		message="Sign in to enable cloud backup and sync"
	/>
{/if}

<!-- Cloud Sync Prompt Modal -->
{#if showCloudPrompt}
	<CloudSyncPrompt onClose={() => showCloudPrompt = false} />
{/if}

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

	.settings-row:active:not(.static):not(.coming-soon):not(.account-row) {
		background: var(--color-surface-active);
	}

	.settings-row:disabled {
		opacity: 0.5;
	}

	.account-row {
		cursor: default;
		padding: var(--space-4);
	}

	.avatar {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: var(--color-surface-hover);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text-muted);
		overflow: hidden;
		flex-shrink: 0;
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.settings-row :global(.row-icon),
	.settings-row .row-icon {
		color: var(--color-primary);
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.settings-row :global(.row-icon.logout) {
		color: var(--color-text-muted);
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

	/* Storage Selector */
	.storage-selector {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.storage-option {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-4);
		background: none;
		border: none;
		border-bottom: 0.5px solid var(--color-border);
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition: all var(--transition-fast);
		opacity: 0.6;
	}

	.storage-option:last-child {
		border-bottom: none;
	}

	.storage-option.active {
		opacity: 1;
		background: var(--color-primary-soft);
	}

	.storage-option:hover:not(.active) {
		background: var(--color-surface-hover);
		opacity: 0.8;
	}

	.storage-icon {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface-hover);
		border-radius: var(--radius-md);
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.storage-option.active .storage-icon {
		background: var(--color-primary);
		color: white;
	}

	.storage-icon.cloud {
		background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
		color: white;
	}

	.storage-info {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.storage-title {
		font-weight: 600;
		font-size: 1rem;
	}

	.storage-desc {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
	}

	.storage-check {
		color: var(--color-primary);
	}

	.spinning {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* Privacy Card */
	.privacy-card {
		display: flex;
		gap: var(--space-3);
		padding: var(--space-4);
		background: var(--color-success-soft);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-6);
		color: var(--color-success);
	}

	.privacy-card strong {
		display: block;
		margin-bottom: var(--space-1);
	}

	.privacy-card p {
		font-size: 0.8125rem;
		margin: 0;
		opacity: 0.9;
	}

	/* Messages */
	.import-message,
	.sync-message {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		margin-bottom: var(--space-6);
	}

	.import-message.success,
	.sync-message.success {
		background: var(--color-success-soft);
		color: var(--color-success);
	}

	.import-message.error,
	.sync-message.error {
		background: rgba(248, 113, 113, 0.1);
		color: var(--color-error);
	}

	/* About */
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
