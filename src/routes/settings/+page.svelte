<!--
	Settings Page - With Import and Sync Coming Soon
-->
<script lang="ts">
	import { APP_NAME, APP_TAGLINE } from '$lib/config/branding';
	import { exportAsJson, exportAsCsv, importFromJson } from '$lib/export/json';
	import { Download, Upload, FileJson, FileSpreadsheet, Github, Shield, Heart, Cloud, AlertCircle, CheckCircle } from 'lucide-svelte';

	let exporting = $state(false);
	let importing = $state(false);
	let importMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);
	let fileInput: HTMLInputElement;

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
				// Reload the page to reflect imported data
				setTimeout(() => window.location.reload(), 1500);
			}
		} finally {
			importing = false;
			input.value = '';
		}
	}
</script>

<div class="container">
	<header class="page-header animate-fade-in">
		<h1>Settings</h1>
	</header>

	<!-- Export Section -->
	<section class="section animate-slide-up">
		<div class="section-header">
			<Download size={20} />
			<h2>Export Data</h2>
		</div>
		<p class="section-desc">Your data is yours. Export anytime, no restrictions.</p>

		<div class="export-buttons">
			<button class="export-btn" onclick={handleJsonExport} disabled={exporting}>
				<FileJson size={24} />
				<div class="export-btn-content">
					<span class="export-btn-title">Export JSON</span>
					<span class="export-btn-desc">Full data backup</span>
				</div>
			</button>
			<button class="export-btn" onclick={handleCsvExport} disabled={exporting}>
				<FileSpreadsheet size={24} />
				<div class="export-btn-content">
					<span class="export-btn-title">Export CSV</span>
					<span class="export-btn-desc">For spreadsheets</span>
				</div>
			</button>
		</div>
	</section>

	<!-- Import Section -->
	<section class="section animate-slide-up" style="animation-delay: 50ms">
		<div class="section-header">
			<Upload size={20} />
			<h2>Import Data</h2>
		</div>
		<p class="section-desc">Restore from a previous JSON export.</p>

		<input 
			type="file" 
			accept=".json"
			bind:this={fileInput}
			onchange={handleFileSelect}
			hidden
		/>

		<button class="import-btn" onclick={triggerImport} disabled={importing}>
			<FileJson size={24} />
			<div class="import-btn-content">
				<span class="import-btn-title">{importing ? 'Importing...' : 'Import JSON'}</span>
				<span class="import-btn-desc">Replaces all existing data</span>
			</div>
		</button>

		{#if importMessage}
			<div class="import-message {importMessage.type}">
				{#if importMessage.type === 'success'}
					<CheckCircle size={16} />
				{:else}
					<AlertCircle size={16} />
				{/if}
				{importMessage.text}
			</div>
		{/if}
	</section>

	<!-- Sync Section (Coming Soon) -->
	<section class="section animate-slide-up" style="animation-delay: 100ms">
		<div class="section-header">
			<Cloud size={20} />
			<h2>Cloud Sync</h2>
		</div>
		<div class="coming-soon-card">
			<div class="coming-soon-badge">Coming Soon</div>
			<p>End-to-end encrypted sync across your devices is under development. Your data will remain private—only you hold the encryption keys.</p>
		</div>
	</section>

	<!-- About Section -->
	<section class="section animate-slide-up" style="animation-delay: 150ms">
		<div class="about-card">
			<div class="about-logo">📊</div>
			<h3 class="about-name">{APP_NAME}</h3>
			<p class="about-tagline">{APP_TAGLINE}</p>
			<span class="version-badge">v0.1.0</span>

			<div class="about-links">
				<a href="https://github.com" target="_blank" rel="noopener" class="about-link">
					<Github size={18} />
					View Source
				</a>
			</div>
		</div>
	</section>

	<!-- Privacy Section -->
	<section class="section animate-slide-up" style="animation-delay: 200ms">
		<div class="section-header">
			<Shield size={20} />
			<h2>Privacy</h2>
		</div>
		<div class="privacy-card">
			<p>
				<strong>100% Local Storage</strong><br>
				All your data is stored on your device. Nothing is sent to any server.
			</p>
			<p>
				<strong>No Tracking</strong><br>
				We don't collect analytics, telemetry, or personal information.
			</p>
			<p>
				<strong>Open Source</strong><br>
				Review the code yourself. Trust through transparency.
			</p>
		</div>
	</section>

	<footer class="footer animate-fade-in" style="animation-delay: 250ms">
		<p>Made with <Heart size={14} class="heart-icon" /> for better habits</p>
	</footer>
</div>

<style>
	.section {
		margin-bottom: var(--space-6);
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
		color: var(--color-text);
	}

	.section-header h2 {
		font-size: 1rem;
		font-weight: 600;
	}

	.section-desc {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		margin-bottom: var(--space-4);
	}

	/* Export/Import buttons */
	.export-buttons {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.export-btn,
	.import-btn {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		color: var(--color-text);
		font: inherit;
		cursor: pointer;
		transition: all var(--transition-fast);
		text-align: left;
	}

	.export-btn:hover:not(:disabled),
	.import-btn:hover:not(:disabled) {
		border-color: var(--color-primary);
		background: var(--color-primary-soft);
	}

	.export-btn:disabled,
	.import-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.export-btn-content,
	.import-btn-content {
		display: flex;
		flex-direction: column;
	}

	.export-btn-title,
	.import-btn-title {
		font-weight: 600;
	}

	.export-btn-desc,
	.import-btn-desc {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	/* Import message */
	.import-message {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-top: var(--space-3);
		padding: var(--space-3);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
	}

	.import-message.success {
		background: var(--color-success-soft);
		color: var(--color-success);
	}

	.import-message.error {
		background: rgba(248, 113, 113, 0.1);
		color: var(--color-error);
	}

	/* Coming soon card */
	.coming-soon-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
	}

	.coming-soon-badge {
		display: inline-block;
		padding: var(--space-1) var(--space-3);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-accent);
		background: var(--color-accent-soft);
		border-radius: var(--radius-full);
		margin-bottom: var(--space-3);
	}

	.coming-soon-card p {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		line-height: 1.6;
	}

	/* About card */
	.about-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: var(--space-6);
		text-align: center;
	}

	.about-logo {
		font-size: 3rem;
		margin-bottom: var(--space-3);
	}

	.about-name {
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: var(--space-1);
		background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.about-tagline {
		color: var(--color-text-muted);
		margin-bottom: var(--space-3);
	}

	.version-badge {
		display: inline-block;
		padding: var(--space-1) var(--space-3);
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-text-muted);
		background: var(--color-surface-hover);
		border-radius: var(--radius-full);
		margin-bottom: var(--space-4);
	}

	.about-links {
		display: flex;
		justify-content: center;
	}

	.about-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		background: var(--color-surface-hover);
		border-radius: var(--radius-full);
		transition: all var(--transition-fast);
	}

	.about-link:hover {
		color: var(--color-text);
		background: var(--color-surface-active);
	}

	/* Privacy card */
	.privacy-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
	}

	.privacy-card p {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		padding: var(--space-3) 0;
	}

	.privacy-card p:not(:last-child) {
		border-bottom: 1px solid var(--color-border);
	}

	.privacy-card strong {
		color: var(--color-text);
		display: block;
		margin-bottom: var(--space-1);
	}

	/* Footer */
	.footer {
		text-align: center;
		padding: var(--space-6) 0;
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	.footer p {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-1);
	}

	.footer :global(.heart-icon) {
		color: var(--color-primary);
	}
</style>
