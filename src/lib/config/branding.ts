/**
 * BetterBe Branding Configuration
 * 
 * Change these values to rebrand the entire application.
 * All UI components should import from this file.
 */

export const APP_NAME = 'BetterBe';
export const APP_TAGLINE = 'Track behaviors, not streaks';
export const APP_DESCRIPTION = 'Analytics-first habit & goal tracker';

export const THEME = {
    // Dark theme by default
    colors: {
        background: '#1a1a2e',
        surface: '#16213e',
        surfaceHover: '#1f3460',
        primary: '#e94560',
        primaryHover: '#ff6b6b',
        secondary: '#0f3460',
        text: '#eaeaea',
        textMuted: '#a0a0a0',
        success: '#4ade80',
        warning: '#fbbf24',
        error: '#ef4444',
        neutral: '#6b7280'
    },
    // Momentum indicator colors (intentionally neutral, not value-laden)
    momentum: {
        improving: '#4ade80',  // Green-ish but soft
        stable: '#6b7280',     // Neutral gray
        declining: '#fbbf24'   // Amber (not red - we don't punish)
    }
} as const;

export const COPY = {
    // Honest, not encouraging
    emptyState: {
        noHabits: 'No habits yet. Create your first one.',
        noCheckIns: 'No check-ins recorded.',
        noGoals: 'No goals defined.'
    },
    // No motivational fluff
    analytics: {
        improving: 'Improving',
        stable: 'Stable',
        declining: 'Declining'
    }
} as const;
