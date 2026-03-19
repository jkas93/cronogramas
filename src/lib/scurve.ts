import {
  differenceInDays,
  eachDayOfInterval,
  format,
  parseISO,
  isAfter,
  isBefore,
  isEqual,
  min as minDate,
  max as maxDate,
} from 'date-fns';
import type { Activity, DailyProgress, SCurvePoint, SCurveData } from './types';

// =============================================================
// S-CURVE (EVM) ALGORITHM
// =============================================================

/**
 * Calculates the planned daily contribution of an activity.
 * Uses linear distribution: the activity's weight is distributed
 * evenly across all days in its date range.
 *
 * @param activity - The activity with start_date, end_date, and weight
 * @returns weight per day
 */
function getPlannedDailyWeight(activity: Activity): number {
  const start = parseISO(activity.start_date);
  const end = parseISO(activity.end_date);
  const durationDays = differenceInDays(end, start) + 1; // inclusive
  return activity.weight / Math.max(durationDays, 1);
}

/**
 * Calculates the S-Curve data points (Planned and Actual) for a project.
 *
 * PLANNED CURVE:
 * For each day in the project timeline, we accumulate the daily weight
 * of each activity whose date range covers that day. The cumulative
 * sum is normalized to 0–100%.
 *
 * ACTUAL CURVE:
 * For each day, we sum the weighted daily progress entries. Each entry's
 * contribution = (progress_percent / 100) * activity_weight, distributed
 * at the date the progress was recorded. The cumulative sum is normalized.
 *
 * @param projectStartDate - Project start date (ISO string)
 * @param projectEndDate - Project end date (ISO string)
 * @param activities - All activities in the project
 * @param dailyProgress - All daily progress entries for those activities
 * @returns SCurveData with points and summary metrics
 */
export function calculateSCurve(
  projectStartDate: string,
  projectEndDate: string,
  activities: Activity[],
  dailyProgress: DailyProgress[]
): SCurveData {
  if (activities.length === 0) {
    return {
      points: [],
      totalWeight: 0,
      currentPlanned: 0,
      currentActual: 0,
      spiIndex: 1,
    };
  }

  const pStart = parseISO(projectStartDate);
  const pEnd = parseISO(projectEndDate);

  // Generate all days in the project timeline
  const allDays = eachDayOfInterval({ start: pStart, end: pEnd });

  // Total weight across all activities
  const totalWeight = activities.reduce((sum, a) => sum + Number(a.weight), 0);

  if (totalWeight === 0) {
    return {
      points: allDays.map((d) => ({
        date: format(d, 'yyyy-MM-dd'),
        planned: 0,
        actual: 0,
        deviation: 0,
      })),
      totalWeight: 0,
      currentPlanned: 0,
      currentActual: 0,
      spiIndex: 1,
    };
  }

  // Build a map of activity_id → DailyProgress[]
  const progressByActivity = new Map<string, DailyProgress[]>();
  for (const dp of dailyProgress) {
    const existing = progressByActivity.get(dp.activity_id) || [];
    existing.push(dp);
    progressByActivity.set(dp.activity_id, existing);
  }

  // Pre-compute the daily planned weight for each activity
  const activityDailyWeights = activities.map((a) => ({
    activity: a,
    dailyWeight: getPlannedDailyWeight(a),
    start: parseISO(a.start_date),
    end: parseISO(a.end_date),
  }));

  // Build a map of date → actual weight gained that day
  const actualDailyGain = new Map<string, number>();
  for (const activity of activities) {
    const progEntries = progressByActivity.get(activity.id) || [];
    for (const entry of progEntries) {
      const dateKey = entry.date;
      const gain = (Number(entry.progress_percent) / 100) * Number(activity.weight);
      actualDailyGain.set(dateKey, (actualDailyGain.get(dateKey) || 0) + gain);
    }
  }

  // Calculate cumulative curves
  let cumulativePlanned = 0;
  let cumulativeActual = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentPlanned = 0;
  let currentActual = 0;

  const points: SCurvePoint[] = allDays.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd');

    // Planned: sum daily weights for activities active on this day
    let plannedGain = 0;
    for (const { dailyWeight, start, end } of activityDailyWeights) {
      if (
        (isAfter(day, start) || isEqual(day, start)) &&
        (isBefore(day, end) || isEqual(day, end))
      ) {
        plannedGain += dailyWeight;
      }
    }
    cumulativePlanned += plannedGain;

    // Actual: sum recorded progress for this day
    const actualGain = actualDailyGain.get(dayStr) || 0;
    cumulativeActual += actualGain;

    // Normalize to percentage
    const plannedPct = (cumulativePlanned / totalWeight) * 100;
    const actualPct = (cumulativeActual / totalWeight) * 100;

    // Track current day values
    if (isEqual(day, today) || (isBefore(day, today) && isAfter(day, pStart))) {
      currentPlanned = plannedPct;
      currentActual = actualPct;
    }

    return {
      date: dayStr,
      planned: Math.round(plannedPct * 100) / 100,
      actual: Math.round(actualPct * 100) / 100,
      deviation: Math.round((actualPct - plannedPct) * 100) / 100,
    };
  });

  // Schedule Performance Index (SPI = Actual / Planned)
  const spiIndex = currentPlanned > 0 ? currentActual / currentPlanned : 1;

  return {
    points,
    totalWeight,
    currentPlanned: Math.round(currentPlanned * 100) / 100,
    currentActual: Math.round(currentActual * 100) / 100,
    spiIndex: Math.round(spiIndex * 100) / 100,
  };
}

// =============================================================
// DEVIATION THRESHOLDS
// =============================================================

export const DEVIATION_THRESHOLDS = {
  INFO: 5,      // 5% deviation → info
  WARNING: 10,  // 10% deviation → warning
  CRITICAL: 20, // 20% deviation → critical
};

/**
 * Determines the severity of a deviation.
 */
export function getDeviationSeverity(
  deviationPercent: number
): 'info' | 'warning' | 'critical' | null {
  const abs = Math.abs(deviationPercent);
  if (abs >= DEVIATION_THRESHOLDS.CRITICAL) return 'critical';
  if (abs >= DEVIATION_THRESHOLDS.WARNING) return 'warning';
  if (abs >= DEVIATION_THRESHOLDS.INFO) return 'info';
  return null;
}
