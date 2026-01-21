/**
 * Authentication Store
 * 
 * Manages user authentication state and provides
 * reactive access to auth status throughout the app.
 */

import { writable, derived } from 'svelte/store';
import { remoteAuth } from './remote';
import { currentUser, socialModeEnabled } from './index';
import type { UserProfile, AuthResponse } from './types';

/**
 * Auth loading state
 */
export const authLoading = writable<boolean>(false);

/**
 * Auth error message
 */
export const authError = writable<string | null>(null);

/**
 * Whether user is authenticated
 */
export const isAuthenticated = derived(currentUser, $user => $user !== null);

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<void> {
    authLoading.set(true);
    authError.set(null);

    try {
        const redirectUrl = await remoteAuth.initiateGoogleAuth();
        window.location.href = redirectUrl;
    } catch (e) {
        authError.set(e instanceof Error ? e.message : 'Failed to sign in with Google');
        authLoading.set(false);
    }
}

/**
 * Handle Google OAuth callback
 */
export async function handleGoogleCallback(code: string): Promise<void> {
    authLoading.set(true);
    authError.set(null);

    try {
        const response = await remoteAuth.handleGoogleCallback(code);
        setAuthState(response);
    } catch (e) {
        authError.set(e instanceof Error ? e.message : 'Failed to complete sign in');
    } finally {
        authLoading.set(false);
    }
}

/**
 * Sign in with Apple
 */
export async function signInWithApple(): Promise<void> {
    authLoading.set(true);
    authError.set(null);

    try {
        const config = await remoteAuth.initiateAppleAuth();
        // Apple Sign In requires client-side SDK
        // This will be handled by the native app or web SDK
        console.log('Apple auth config:', config);
    } catch (e) {
        authError.set(e instanceof Error ? e.message : 'Failed to sign in with Apple');
        authLoading.set(false);
    }
}

/**
 * Handle Apple Sign In callback
 */
export async function handleAppleCallback(code: string, idToken: string, user?: string): Promise<void> {
    authLoading.set(true);
    authError.set(null);

    try {
        const response = await remoteAuth.handleAppleCallback(code, idToken, user);
        setAuthState(response);
    } catch (e) {
        authError.set(e instanceof Error ? e.message : 'Failed to complete sign in');
    } finally {
        authLoading.set(false);
    }
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
    authLoading.set(true);
    
    try {
        await remoteAuth.logout();
    } finally {
        currentUser.set(null);
        socialModeEnabled.set(false);
        authLoading.set(false);
    }
}

/**
 * Check and restore auth state on app load
 */
export async function checkAuthState(): Promise<void> {
    try {
        const user = await remoteAuth.getCurrentUser();
        if (user) {
            currentUser.set(user);
            socialModeEnabled.set(user.cloudSyncEnabled);
        }
    } catch {
        // Not authenticated, that's fine
    }
}

/**
 * Set auth state from response
 */
function setAuthState(response: AuthResponse): void {
    currentUser.set(response.user);
    socialModeEnabled.set(response.user.cloudSyncEnabled);
}

