# Building Native Android App

This project uses [Capacitor](https://capacitorjs.com/) to wrap the BetterBe SvelteKit application in a native Android WebView.

## Prerequisites

1.  **Node.js** and **npm** installed.
2.  **Android Studio** installed on your machine.
    *   Ensure the Android SDK Command-line Tools are installed via Android Studio's SDK Manager.

## Build Steps

To generate the Android APK (or App Bundle):

1.  **Build the Web Assets for Mobile**
    This command builds the SvelteKit app with the correct configuration for running locally on a device (checking `CAPACITOR_BUILD=true` to handle paths).
    ```bash
    npm run build:mobile
    ```

2.  **Sync with Android Platform**
    This copies the built web assets into the Android native project.
    ```bash
    npx cap sync
    ```

3.  **Open in Android Studio**
    This will launch Android Studio with the project configuration loaded.
    ```bash
    npx cap open android
    ```

4.  **Build APK**
    *   In Android Studio, wait for Gradle to sync.
    *   Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
    *   Once finished, a notification will appear to "locate" the generated APK file.

## Troubleshooting

-   **Base Path Issues**: If the app shows a white screen, ensure you ran `npm run build:mobile` specifically, as `npm run build` is configured for GitHub Pages (subpath `/betterbe`) which won't load correctly on Android.
-   **Gradle Errors**: Ensure your Java/JDK version matches what the Capacitor project expects (usually JDK 17 or 21).

## Live Reload (Development)

To run on a connected Android device with hot reload:

1.  Find your computer's local IP address (e.g., `192.168.1.5`).
2.  Run the development server bound to that IP:
    ```bash
    npm run dev -- --host 192.168.1.5
    ```
3.  Update `capacitor.config.ts`:
    ```typescript
    server: {
      url: 'http://192.168.1.5:5173',
      cleartext: true
    }
    ```
4.  Run `npx cap sync` and then run the app from Android Studio.

## Automated Build (GitHub Actions)

A GitHub Action has been configured in `.github/workflows/android.yml` to automatically build the APK.

1.  Push your changes to the `main` branch.
2.  Go to the **Actions** tab in your GitHub repository.
3.  Click on the "Android Build" workflow run.
4.  Once completed, download the `app-debug` artifact to get the APK file.
