/**
 * Server URL Plugin
 * 
 * Allows the Android app to load from a remote URL instead of local assets.
 * This enables OTA (Over-The-Air) updates without rebuilding the APK.
 */

import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export interface ServerUrlPlugin {
    /**
     * Get the currently configured server URL
     */
    getServerUrl(): Promise<{ url: string }>;
    
    /**
     * Set the server URL and reload the app
     */
    setServerUrl(options: { url: string }): Promise<{ success: boolean }>;
    
    /**
     * Check for updates by reloading from the configured server URL
     */
    checkForUpdates(): Promise<{ success: boolean }>;
    
    /**
     * Reset to local assets (clear server URL)
     */
    resetToLocal(): Promise<{ success: boolean }>;
}

class ServerUrlPluginWeb implements ServerUrlPlugin {
    async getServerUrl(): Promise<{ url: string }> {
        // In web, return empty (always uses local)
        return { url: '' };
    }
    
    async setServerUrl(): Promise<{ success: boolean }> {
        // In web, this is a no-op
        return { success: false };
    }
    
    async checkForUpdates(): Promise<{ success: boolean }> {
        // In web, just reload the page
        window.location.reload();
        return { success: true };
    }
    
    async resetToLocal(): Promise<{ success: boolean }> {
        return { success: true };
    }
}

// Get the native plugin or fallback to web implementation
const ServerUrl = Capacitor.isNativePlatform()
    ? (Capacitor.getPlatform() === 'android'
        ? (Capacitor.Plugins as any).ServerUrl as ServerUrlPlugin
        : new ServerUrlPluginWeb())
    : new ServerUrlPluginWeb();

export default ServerUrl;

