import type { Habit, CheckIn } from '$lib/db/schema';
import { calculateMomentumSync } from './momentum';

/**
 * Generate a natural language summary of habit performance
 */
export function generateTextSummary(
    habits: Habit[],
    checkIns: CheckIn[],
    days: number
): string {
    if (habits.length === 0) return "You haven't created any habits yet.";
    if (checkIns.length === 0) return "No activity recorded yet. Start tracking your habits!";

    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);

    // Filter check-ins within the time range
    const recentCheckIns = checkIns.filter(c => new Date(c.effectiveDate) >= startDate);

    // Calculate consistency for each habit
    const stats = habits.map(habit => {
        const habitCheckIns = recentCheckIns.filter(c => c.habitId === habit.id);
        const daysWithCheckIn = new Set(habitCheckIns.map(c => c.effectiveDate)).size;
        const consistency = daysWithCheckIn / days;

        // Use existing momentum logic for trend
        const momentum = calculateMomentumSync(habit, checkIns.filter(c => c.habitId === habit.id));

        return {
            name: habit.name,
            consistency,
            trend: momentum.direction
        };
    });

    // Group by performance
    const strong = stats.filter(s => s.consistency >= 0.7);
    const improving = stats.filter(s => s.consistency >= 0.4 && s.consistency < 0.7 && s.trend === 'improving');
    const struggling = stats.filter(s => s.consistency < 0.4 || (s.consistency < 0.7 && s.trend === 'declining'));

    const parts: string[] = [];

    // Strong habits
    if (strong.length > 0) {
        if (strong.length === habits.length) {
            parts.push(`You're crushing it! You've been consistently maintaining all your habits over the last ${days} days.`);
            return parts.join(' ');
        }

        const names = strong.map(s => s.name).slice(0, 3).join(', ');
        const suffix = strong.length > 3 ? `and ${strong.length - 3} others` : '';
        parts.push(`You're doing great with **${names}${suffix ? ' ' + suffix : ''}**.`);
    }

    // Improving
    if (improving.length > 0) {
        const names = improving.map(s => s.name).slice(0, 2).join(' and ');
        parts.push(`You're building momentum with **${names}**.`);
    }

    // Struggling
    if (struggling.length > 0) {
        const topStruggle = struggling[0];
        if (strong.length === 0 && improving.length === 0) {
            parts.push(`It's been a tough ${days} days. Pick one habit like **${topStruggle.name}** and focus on just that for tomorrow.`);
        } else {
            parts.push(`Consider giving a bit more attention to **${topStruggle.name}** to get back on track.`);
        }
    }

    if (parts.length === 0) {
        return `You have had a balanced mix of activity over the last ${days} days.`;
    }

    return parts.join(' ');
}
