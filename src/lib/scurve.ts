import {
  eachDayOfInterval,
  format,
  parseISO,
  isAfter,
  isBefore,
  isEqual,
  max as maxDate,
} from 'date-fns';
import type { Activity, DailyProgress, SCurvePoint, SCurveData } from './types';

// =============================================================
// S-CURVE (EVM) ALGORITHM
// =============================================================

/**
 * Helper to check if a day is a working day based on a schedule.
 * @param date - Date to check
 * @param workingDays - Array of day indices (0=Sun, 1=Mon, ..., 6=Sat)
 */
function isWorkingDay(date: Date, workingDays: number[] = [1, 2, 3, 4, 5, 6]): boolean {
  return workingDays.includes(date.getDay());
}

/**
 * Counts the number of working days in a date range efficiently.
 * Optimized to avoid creating temporary date arrays for every activity.
 * 
 * @param start - Start date of the range
 * @param end - End date of the range
 * @param workingDays - Days of the week that are laborable (0=Sun, 1=Mon, ..., 6=Sat)
 */
function countWorkingDays(start: Date, end: Date, workingDays: number[] = [1, 2, 3, 4, 5, 6]): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    if (workingDays.includes(current.getDay())) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Calculates the planned daily contribution of an activity.
 * Uses linear distribution ONLY across working days (defined as Mon-Sat by default).
 * 
 * @param activity - The activity with start_date, end_date, and weight
 * @returns units of weight that represent one working day of progress
 */
function getPlannedDailyWeight(activity: Activity): number {
  const start = parseISO(activity.start_date);
  const end = parseISO(activity.end_date);
  const workingDaysCount = countWorkingDays(start, end);
  return activity.weight / Math.max(workingDaysCount, 1);
}

/**
 * Calculates the S-Curve data points (Planned and Actual) for a project following
 * the Earned Value Management (EVM) principles and P.U.L.S.O. methodology.
 *
 * PLANNED CURVE:
 * Accumulates daily weight targets based on activity schedules and working calendars.
 * 
 * ACTUAL CURVE:
 * Accumulates actual progress reported as percentages of activity weight. 
 * Includes "Plateau" logic to show gaps in work or delays.
 *
 * @param projectStartDate - Project start date (ISO string)
 * @param projectEndDate - Project end date (ISO string)
 * @param activities - All activities in the project
 * @param dailyProgress - All daily progress entries for those activities
 */
export function calculateSCurve(
  projectStartDate: string,
  projectEndDate: string,
  activities: Activity[],
  dailyProgress: DailyProgress[]
): SCurveData {
  if (activities.length === 0) {
    return {
      points: [], totalWeight: 0, currentPlanned: 0, currentActual: 0, spiIndex: 1, latestProgressDate: null
    };
  }

  const pStart = parseISO(projectStartDate);
  const pEnd = parseISO(projectEndDate);

  // Extend timeline to cover ALL activity dates (matching Gantt's fit_tasks behavior)
  let timelineStart = pStart;
  let timelineEnd = pEnd;
  for (const a of activities) {
    const aStart = parseISO(a.start_date);
    const aEnd = parseISO(a.end_date);
    if (isBefore(aStart, timelineStart)) timelineStart = aStart;
    if (isAfter(aEnd, timelineEnd)) timelineEnd = aEnd;
  }

  // Generate all days in the extended timeline
  const allDays = eachDayOfInterval({ start: timelineStart, end: timelineEnd });

  // Total weight across all activities
  const totalWeight = activities.reduce((sum, a) => sum + Number(a.weight), 0);

  if (totalWeight === 0) {
    return {
      points: allDays.map((d) => ({
        date: format(d, 'yyyy-MM-dd'), planned: 0, actual: 0, deviation: 0
      })),
      totalWeight: 0, currentPlanned: 0, currentActual: 0, spiIndex: 1, latestProgressDate: null
    };
  }

  // Pre-calculate daily progress mapping for efficiency O(N)
  const progressByActivity = new Map<string, DailyProgress[]>();
  for (const dp of dailyProgress) {
    const existing = progressByActivity.get(dp.activity_id) || [];
    existing.push(dp);
    progressByActivity.set(dp.activity_id, existing);
  }

  // Pre-compute activity weights and date ranges for loop optimization O(A)
  const activityDailyWeights = activities.map((a) => ({
    dailyWeight: getPlannedDailyWeight(a),
    start: parseISO(a.start_date),
    end: parseISO(a.end_date),
    id: a.id,
    weight: Number(a.weight)
  }));

  // Map of activity gains per date O(P)
  const actualDailyGain = new Map<string, number>();
  for (const activity of activityDailyWeights) {
    const progEntries = progressByActivity.get(activity.id) || [];
    for (const entry of progEntries) {
      const gain = (Number(entry.progress_percent) / 100) * activity.weight;
      actualDailyGain.set(entry.date, (actualDailyGain.get(entry.date) || 0) + gain);
    }
  }

  // Find the latest date of progress entries to stop the actual curve at that date
  const validProgress = dailyProgress.filter(dp => Number(dp.progress_percent) > 0 || !!dp.notes || (dp.photo_urls && dp.photo_urls.length > 0) || dp.has_restriction);
  const latestProgressDate = validProgress.length > 0
    ? maxDate(validProgress.map((dp) => parseISO(dp.date)))
    : null;

  // Calculate cumulative curves
  let cumulativePlanned = 0;
  let cumulativeActual = 0;
  let currentPlanned = 0;
  let currentActual = 0;

  // Lima Timezone (GMT-5) consistently
  const nowLima = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }));
  const today = new Date(nowLima.getFullYear(), nowLima.getMonth(), nowLima.getDate());

  let canContinueActual = true;
  const points: SCurvePoint[] = allDays.map((day) => {
    // Manual date string formatting is faster than date-fns format() for thousands of calls
    const dayStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

    // Planned: sum daily weights for activities active on this day ONLY if it's a working day
    let plannedGain = 0;
    if (isWorkingDay(day)) {
      for (const { dailyWeight, start, end } of activityDailyWeights) {
        if (
          (isAfter(day, start) || isEqual(day, start)) &&
          (isBefore(day, end) || isEqual(day, end))
        ) {
          plannedGain += dailyWeight;
        }
      }
    }
    cumulativePlanned += plannedGain;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
    // Actual: sum recorded progress for this day (Actual can happen on any day)
    const actualGain = actualDailyGain.get(dayStr) || 0;
    cumulativeActual += actualGain;

    // Normalize to percentage (Planned cap at 100)
    const plannedPct = Math.min((cumulativePlanned / totalWeight) * 100, 100);
    const actualPct = (cumulativeActual / totalWeight) * 100;

    // Track cumulative values for the target day (today OR the last project day if project ended)
    const isTargetDay = (isEqual(day, today) || (isBefore(day, today) && isAfter(day, timelineStart)));
    const isProjectEnd = isEqual(day, timelineEnd) && isAfter(today, timelineEnd);

    if (isTargetDay || isProjectEnd) {
      currentPlanned = plannedPct;
      currentActual = actualPct;
    }

    // Show actual curve logic:
    // 1. Always show if it's before or on the latest record.
    // 2. If after last record: 
    //    - If there was NOTHING planned for this day, allow it to plateau (continue showing).
    //    - If there WAS something planned but no progress, stop the curve (it's a delay).
    let shouldShowActual = false;
    if (latestProgressDate && (isBefore(day, latestProgressDate) || isEqual(day, latestProgressDate))) {
      shouldShowActual = true;
    } else if (canContinueActual && (isBefore(day, today) || isEqual(day, today))) {
      if (plannedGain === 0) {
        shouldShowActual = true;
      } else {
        canContinueActual = false;
        shouldShowActual = false;
      }
    }

    return {
      date: dayStr,
      planned: Math.round(plannedPct * 100) / 100,
      actual: shouldShowActual ? Math.round(actualPct * 100) / 100 : undefined,
      deviation: Math.round((actualPct - plannedPct) * 100) / 100,
    } as SCurvePoint;
  });

  // Schedule Performance Index (SPI = Actual / Planned)
  const spiIndex = currentPlanned > 0 ? currentActual / currentPlanned : 1;

  return {
    points,
    totalWeight,
    currentPlanned: Math.round(currentPlanned * 100) / 100,
    currentActual: Math.round(currentActual * 100) / 100,
    spiIndex: Math.round(spiIndex * 100) / 100,
    latestProgressDate: latestProgressDate ? format(latestProgressDate, 'yyyy-MM-dd') : null,
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
