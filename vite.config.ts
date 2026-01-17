import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'BetterBe',
				short_name: 'BetterBe',
				description: 'Analytics-first habit & goal tracker',
				theme_color: '#0a0a0f',
				background_color: '#0a0a0f',
				display: 'standalone',
				icons: [
					{
						src: 'icon-192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: 'icon-512.png',
						sizes: '512x512',
						type: 'image/png'
					}
				]
			},
			workbox: {
				// Cache all static assets
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],

				// Runtime caching for navigation/API
				runtimeCaching: [
					{
						// Cache-first strategy for all pages with 24h expiration
						urlPattern: ({ request }) => request.mode === 'navigate',
						handler: 'CacheFirst',
						options: {
							cacheName: 'pages-cache',
							expiration: {
								maxAgeSeconds: 24 * 60 * 60 // 24 hours
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},
					{
						// Cache static assets with stale-while-revalidate
						urlPattern: /\.(?:js|css|woff2?)$/,
						handler: 'StaleWhileRevalidate',
						options: {
							cacheName: 'static-assets',
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
							}
						}
					}
				]
			},
			// Only check for updates once per day
			devOptions: {
				enabled: false
			}
		})
	]
});
