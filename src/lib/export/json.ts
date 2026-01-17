/**
 * Data Export and Import Functions
 */

import { db } from '$lib/db/schema';

/**
 * Export all data as JSON file
 */
export async function exportAsJson(): Promise<void> {
    const data = await getAllData();
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, 'betterbe-export.json', 'application/json');
}

/**
 * Export check-ins as CSV
 */
export async function exportAsCsv(): Promise<void> {
    const habits = await db.habits.toArray();
    const checkIns = await db.checkIns.toArray();

    const habitMap = new Map(habits.map(h => [h.id, h.name]));

    const rows: string[] = ['Habit,Date,Value,Note'];

    for (const checkIn of checkIns) {
        const habitName = habitMap.get(checkIn.habitId) ?? 'Unknown';
        const note = (checkIn.note ?? '').replace(/"/g, '""');
        rows.push(`"${habitName}","${checkIn.effectiveDate}",${checkIn.value},"${note}"`);
    }

    const csv = rows.join('\n');
    downloadFile(csv, 'betterbe-checkins.csv', 'text/csv');
}

/**
 * Import data from JSON file
 * Returns success status and message
 */
export async function importFromJson(file: File): Promise<{ success: boolean; message: string }> {
    try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Validate structure
        if (!data.version || !data.data) {
            return { success: false, message: 'Invalid file format' };
        }

        const { habits, checkIns, checkInContexts, goals, goalHabits, successCriteria, habitSchedules } = data.data;

        // Import in transaction
        await db.transaction('rw', [
            db.habits, db.checkIns, db.checkInContexts,
            db.goals, db.goalHabits, db.successCriteria, db.habitSchedules
        ], async () => {
            // Clear existing data
            await db.habits.clear();
            await db.checkIns.clear();
            await db.checkInContexts.clear();
            await db.goals.clear();
            await db.goalHabits.clear();
            await db.successCriteria.clear();
            await db.habitSchedules.clear();

            // Import new data
            if (habits?.length) await db.habits.bulkAdd(habits);
            if (checkIns?.length) await db.checkIns.bulkAdd(checkIns);
            if (checkInContexts?.length) await db.checkInContexts.bulkAdd(checkInContexts);
            if (goals?.length) await db.goals.bulkAdd(goals);
            if (goalHabits?.length) await db.goalHabits.bulkAdd(goalHabits);
            if (successCriteria?.length) await db.successCriteria.bulkAdd(successCriteria);
            if (habitSchedules?.length) await db.habitSchedules.bulkAdd(habitSchedules);
        });

        const count = (habits?.length || 0) + (checkIns?.length || 0) + (goals?.length || 0);
        return { success: true, message: `Imported ${count} records successfully` };
    } catch (err) {
        console.error('Import error:', err);
        return { success: false, message: 'Failed to parse file' };
    }
}

/**
 * Get all data for export
 */
async function getAllData() {
    const [habits, checkIns, checkInContexts, goals, goalHabits, successCriteria, habitSchedules] =
        await Promise.all([
            db.habits.toArray(),
            db.checkIns.toArray(),
            db.checkInContexts.toArray(),
            db.goals.toArray(),
            db.goalHabits.toArray(),
            db.successCriteria.toArray(),
            db.habitSchedules.toArray()
        ]);

    return {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        data: {
            habits,
            checkIns,
            checkInContexts,
            goals,
            goalHabits,
            successCriteria,
            habitSchedules
        }
    };
}

/**
 * Download a file in the browser
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}
