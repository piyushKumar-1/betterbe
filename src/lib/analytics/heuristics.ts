import type { Habit, CheckIn } from '$lib/db/schema';

export interface Correlation {
    habitA: string;
    habitB: string;
    habitAName: string;
    habitBName: string;
    score: number; // -1 to 1 (negative to positive correlation)
    description: string;
    confidence: number; // 0 to 1 based on sample size
}

/**
 * Find correlations between habits
 * "When you do A, you also do B"
 */
export function findCorrelations(
    habits: Habit[],
    checkIns: CheckIn[]
): Correlation[] {
    if (habits.length < 2) return [];

    const correlations: Correlation[] = [];
    const checkInsByDate = new Map<string, Set<string>>();

    // Group check-ins by date
    checkIns.forEach(c => {
        if (!checkInsByDate.has(c.effectiveDate)) {
            checkInsByDate.set(c.effectiveDate, new Set());
        }
        checkInsByDate.get(c.effectiveDate)?.add(c.habitId);
    });

    const totalDays = checkInsByDate.size;

    // Need minimum data to make correlations
    if (totalDays < 7) return [];

    // Compare every pair
    for (let i = 0; i < habits.length; i++) {
        for (let j = i + 1; j < habits.length; j++) {
            const hA = habits[i];
            const hB = habits[j];

            let bothCount = 0;
            let aCount = 0;
            let bCount = 0;

            checkInsByDate.forEach(habitsOnDate => {
                const hasA = habitsOnDate.has(hA.id);
                const hasB = habitsOnDate.has(hB.id);

                if (hasA) aCount++;
                if (hasB) bCount++;
                if (hasA && hasB) bothCount++;
            });

            // Calculate probabilities
            const pA = aCount / totalDays;
            const pB = bCount / totalDays;
            const pBoth = bothCount / totalDays;

            // Jaccard similarity index for simple correlation
            // Intersection over Union
            const union = aCount + bCount - bothCount;
            if (union === 0) continue;

            const jaccard = bothCount / union;

            // Phi coefficient (Matthews correlation coefficient) for binary data
            // More accurate for correlation (-1 to 1)
            // phi = (n11*n00 - n10*n01) / sqrt(n1*n0*n*0*n*1)
            // Simplified approximation for this context:

            // Only report strong positive correlations for now to be "safe" with heuristics
            // "When you do A, you likely do B"

            // Conditional Probability P(B|A) = P(A and B) / P(A)
            const probBgivenA = aCount > 0 ? bothCount / aCount : 0;
            // Lift = P(B|A) / P(B) -> >1 means positive correlation
            const lift = pB > 0 ? probBgivenA / pB : 0;

            if (aCount > 5 && bCount > 5) { // Minimum sample size for individual habits
                if (lift > 1.5 && probBgivenA > 0.6) {
                    correlations.push({
                        habitA: hA.id,
                        habitB: hB.id,
                        habitAName: hA.name,
                        habitBName: hB.name,
                        score: lift,
                        confidence: Math.min(1, totalDays / 30),
                        description: `When you **${hA.name}**, you are **${(probBgivenA * 100).toFixed(0)}%** likely to also **${hB.name}**.`
                    });
                } else if (lift > 1.5) {
                    // Check reverse P(A|B)
                    const probAgivenB = bCount > 0 ? bothCount / bCount : 0;
                    if (probAgivenB > 0.6) {
                        correlations.push({
                            habitA: hB.id,
                            habitB: hA.id,
                            habitAName: hB.name,
                            habitBName: hA.name,
                            score: lift,
                            confidence: Math.min(1, totalDays / 30),
                            description: `When you **${hB.name}**, you are **${(probAgivenB * 100).toFixed(0)}%** likely to also **${hA.name}**.`
                        });
                    }
                }
            }
        }
    }

    // Sort by score/lift
    return correlations.sort((a, b) => b.score - a.score).slice(0, 3);
}
