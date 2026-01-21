package com.betterbe.app;

import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ServerUrl")
public class ServerUrlPlugin extends Plugin {
    private static final String PREFS_NAME = "BetterBePrefs";
    private static final String KEY_SERVER_URL = "server_url";
    
    @PluginMethod
    public void getServerUrl(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE);
        String url = prefs.getString(KEY_SERVER_URL, "");
        
        JSObject ret = new JSObject();
        ret.put("url", url);
        call.resolve(ret);
    }
    
    @PluginMethod
    public void setServerUrl(PluginCall call) {
        String url = call.getString("url", "");
        
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString(KEY_SERVER_URL, url);
        editor.apply();
        
        // Get MainActivity and update URL
        MainActivity activity = (MainActivity) getActivity();
        if (activity != null) {
            activity.setServerUrl(url);
        }
        
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }
    
    @PluginMethod
    public void checkForUpdates(PluginCall call) {
        MainActivity activity = (MainActivity) getActivity();
        if (activity != null) {
            activity.checkForUpdates();
        }
        
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }
    
    @PluginMethod
    public void resetToLocal(PluginCall call) {
        MainActivity activity = (MainActivity) getActivity();
        if (activity != null) {
            activity.resetToLocal();
        }
        
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }
}

