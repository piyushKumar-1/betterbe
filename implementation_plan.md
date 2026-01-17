# Implementation Plan - Profile & Duration Fix

## Goal Description
1.  **Duration Habit Fix**: Change increment step for 'duration' habits to 1 (currently likely 5 or 15) to match 'count/numeric' habits.
2.  **Profile Section**: Add a new "Profile" tab to the app. This section will provide high-level analytics and summaries.
    -   **Summary Tabs**: Toggle between 7 days, 14 days, and 30 days.
    -   **Text Summary**: Generate a natural language summary of performance (e.g., "You've been consistent with Meditation but struggled with Reading").
    -   **Heuristics**: Analyze correlations between habits (e.g., "When you Sleep Well, you are 80% more likely to Exercise").

## Proposed Changes

### 1. Duration Habit Fix
#### [MODIFY] [src/routes/+page.svelte](file:///Users/piyush/Projects/betterbe/src/routes/+page.svelte)
-   Update `increment` and `decrement` functions to check if `habit.type === 'duration'` and use step `1` instead of higher values.
-   Ensure the stepper UI supports single-digit increments cleanly.

### 2. Profile Section structure
#### [NEW] [src/routes/profile/+page.svelte](file:///Users/piyush/Projects/betterbe/src/routes/profile/+page.svelte)
-   Create new page component.
-   Implement state for selected time range (7, 14, 30).
-   Implement `loadStats` function to aggregate data.

#### [MODIFY] [src/routes/+layout.svelte](file:///Users/piyush/Projects/betterbe/src/routes/+layout.svelte)
-   Add "Profile" to the bottom navigation bar. Use `User` lucide icon.

### 3. Analytics Service enhancement
#### [NEW] [src/lib/analytics/summary.ts](file:///Users/piyush/Projects/betterbe/src/lib/analytics/summary.ts)
-   `generateTextSummary(habits, checkins, days)`: Returns string.
    -   Calculate consistency % for each habit.
    -   Group into "Strong", "Improving", "Needs Focus".
    -   Construct sentences.

#### [NEW] [src/lib/analytics/heuristics.ts](file:///Users/piyush/Projects/betterbe/src/lib/analytics/heuristics.ts)
-   `findCorrelations(habits, checkins)`: Returns `Correlation[]`.
    -   For every pair of habits (A, B):
        -   Calculate P(B|A) (Probability of doing B given A is done).
        -   Compare with P(B) (Base probability of doing B).
        -   If P(B|A) > P(B) * 1.2 -> Positive correlation.
        -   If P(B|A) < P(B) * 0.8 -> Negative correlation.

## Verification Plan
### Automated Tests
-   None planned for this session.

### Manual Verification
-   **Duration Fix**: Go to Today page, find a Duration habit, click +/- and verify it changes by 1.
-   **Profile**:
    -   Click Profile tab.
    -   Switch between 7/14/30 days.
    -   Read generated summary for accuracy against known data.
    -   Check correlations (create dummy data if needed: e.g., always mark Habit A and Habit B together for a few days).
