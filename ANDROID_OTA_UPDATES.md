# Android OTA (Over-The-Air) Updates

The BetterBe Android APK supports loading the app from a remote URL instead of bundled assets. This enables OTA updates without rebuilding and redistributing the APK.

## How It Works

1. **Default Behavior**: The app loads from local bundled assets (normal Capacitor behavior)
2. **Remote Mode**: When a server URL is configured, the app loads from that URL instead
3. **Dynamic Updates**: The app can check for updates and reload from the server anytime

## Configuration

### From Within the App (Recommended)

1. Open the BetterBe app
2. Go to **Settings**
3. Scroll to **App Updates** section (Android only)
4. Tap the settings icon next to "Server URL"
5. Enter your server URL (e.g., `https://piyushkumar-1.github.io/betterbe`)
6. Tap **Save**

The app will immediately reload from the configured URL.

### Features

- **Set Server URL**: Configure where to load the app from
- **Check for Updates**: Manually reload from the server to get the latest version
- **Reset to Local**: Switch back to bundled assets

## Technical Details

### Files Modified

1. **`android/app/src/main/java/com/betterbe/app/MainActivity.java`**
   - Checks for configured server URL on app start
   - Loads from remote URL if configured
   - Provides methods to update URL and reload

2. **`android/app/src/main/java/com/betterbe/app/ServerUrlPlugin.java`**
   - Capacitor plugin exposing server URL management to JavaScript
   - Methods: `getServerUrl()`, `setServerUrl()`, `checkForUpdates()`, `resetToLocal()`

3. **`src/lib/capacitor/server-url.ts`**
   - TypeScript wrapper for the Capacitor plugin
   - Provides web fallback for non-Android platforms

4. **`src/routes/settings/+page.svelte`**
   - UI for configuring server URL (Android only)
   - Shows current configuration and update controls

### Storage

The server URL is stored in Android SharedPreferences:
- Key: `server_url`
- File: `BetterBePrefs`

### URL Format

- Should be a full URL (e.g., `https://your-domain.com`)
- Trailing slash is automatically added if missing
- Must be accessible over HTTPS (or HTTP for development)

## Use Cases

1. **Development**: Point to local dev server during development
2. **Staging**: Test new features on staging environment
3. **Production**: Deploy updates without app store approval
4. **Beta Testing**: Distribute beta versions to testers

## Security Considerations

- Only configure URLs you trust
- Use HTTPS in production
- The app can be redirected to malicious sites if URL is compromised
- Consider adding URL validation/whitelist in production builds

## Building the APK

The OTA update feature is built into the APK. No special build flags needed:

```bash
# Build the web app
npm run build

# Sync to Android
npx cap sync android

# Build APK (in Android Studio or via Gradle)
cd android
./gradlew assembleRelease
```

## Troubleshooting

### App doesn't load from remote URL

1. Check that the URL is correctly configured in Settings
2. Verify the URL is accessible (test in browser)
3. Check Android logs: `adb logcat | grep -i betterbe`
4. Ensure INTERNET permission is granted (already in manifest)

### Plugin not found

- Ensure `ServerUrlPlugin.java` is in the correct package
- Rebuild the app: `npx cap sync android`
- Clean and rebuild in Android Studio

### WebView errors

- Check CORS settings on your server
- Ensure HTTPS is properly configured
- Verify the server serves the correct content type

## Example Server Setup

For GitHub Pages deployment:

1. Deploy your built app to GitHub Pages
2. Get the URL: `https://username.github.io/betterbe`
3. Configure this URL in the Android app
4. The app will load from GitHub Pages instead of local assets

## Future Enhancements

- [ ] Automatic update checking on app start
- [ ] Version checking to prompt for updates
- [ ] URL validation and whitelist
- [ ] Fallback to local assets if remote fails
- [ ] Update notifications

