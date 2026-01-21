package com.betterbe.app;

import android.content.SharedPreferences;
import android.os.Bundle;
import android.webkit.WebView;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String PREFS_NAME = "BetterBePrefs";
    private static final String KEY_SERVER_URL = "server_url";
    private static final String DEFAULT_SERVER_URL = ""; // Empty = use local assets
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }
    
    @Override
    public void onStart() {
        super.onStart();
        
        // Check if we should load from remote URL after bridge is ready
        if (bridge != null && bridge.getWebView() != null) {
            String serverUrl = getServerUrl();
            if (serverUrl != null && !serverUrl.isEmpty()) {
                // Delay slightly to ensure WebView is fully ready
                bridge.getWebView().postDelayed(() -> loadRemoteUrl(serverUrl), 100);
            }
        }
    }
    
    /**
     * Get the configured server URL from SharedPreferences
     */
    public String getServerUrl() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        return prefs.getString(KEY_SERVER_URL, DEFAULT_SERVER_URL);
    }
    
    /**
     * Set the server URL and reload the app
     */
    public void setServerUrl(String url) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString(KEY_SERVER_URL, url);
        editor.apply();
        
        // Reload the webview with new URL
        if (bridge != null && bridge.getWebView() != null) {
            if (url != null && !url.isEmpty()) {
                loadRemoteUrl(url);
                Toast.makeText(this, "Server URL updated. Reloading...", Toast.LENGTH_SHORT).show();
            } else {
                // Reload from local assets
                bridge.getWebView().reload();
                Toast.makeText(this, "Switched to local assets", Toast.LENGTH_SHORT).show();
            }
        }
    }
    
    /**
     * Load the app from a remote URL
     */
    private void loadRemoteUrl(String url) {
        if (bridge == null || bridge.getWebView() == null) {
            return;
        }
        
        // Ensure URL ends with /
        if (!url.endsWith("/")) {
            url += "/";
        }
        
        // Load the remote URL
        bridge.getWebView().loadUrl(url);
    }
    
    /**
     * Check for updates and reload if needed
     */
    public void checkForUpdates() {
        String serverUrl = getServerUrl();
        if (serverUrl != null && !serverUrl.isEmpty()) {
            // Reload from remote URL to get latest version
            loadRemoteUrl(serverUrl);
            Toast.makeText(this, "Checking for updates...", Toast.LENGTH_SHORT).show();
        } else {
            Toast.makeText(this, "Remote URL not configured", Toast.LENGTH_SHORT).show();
        }
    }
    
    /**
     * Reset to local assets
     */
    public void resetToLocal() {
        setServerUrl("");
    }
}
