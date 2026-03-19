import { createClient } from '@/lib/supabase/server';
import type { Activity, DailyProgress, Alert } from './types';
import { calculateSCurve, getDeviationSeverity } from './scurve';
import { format } from 'date-fns';

// =============================================================
// ALERTS ENGINE
// Evaluates project progress and generates alert records
// =============================================================

interface AlertCheckResult {
  newAlerts: Omit<Alert, 'id' | 'created_at'>[];
  spiIndex: number;
  currentDeviation: number;
}

/**
 * Checks a project's activities and daily progress for deviations
 * that warrant alerts. Returns a list of new alerts to create.
 *
 * @param projectId - The project UUID
 * @param projectStartDate - Project start date (ISO)
 * @param projectEndDate - Project end date (ISO)
 * @param activities - All activities in the project
 * @param dailyProgress - All daily progress entries
 */
export function evaluateAlerts(
  projectId: string,
  projectStartDate: string,
  projectEndDate: string,
  activities: Activity[],
  dailyProgress: DailyProgress[]
): AlertCheckResult {
  const scurveData = calculateSCurve(
    projectStartDate,
    projectEndDate,
    activities,
    dailyProgress
  );

  const newAlerts: Omit<Alert, 'id' | 'created_at'>[] = [];
  const today = format(new Date(), 'yyyy-MM-dd');

  // 1. Overall project deviation alert
  const overallDeviation = scurveData.currentActual - scurveData.currentPlanned;
  const overallSeverity = getDeviationSeverity(overallDeviation);

  if (overallSeverity && overallDeviation < 0) {
    newAlerts.push({
      project_id: projectId,
      activity_id: null,
      type: 'progress_deviation',
      message: `El proyecto tiene un retraso del ${Math.abs(overallDeviation).toFixed(1)}% respecto al plan. ` +
        `Avance planificado: ${scurveData.currentPlanned.toFixed(1)}%, ` +
        `Avance real: ${scurveData.currentActual.toFixed(1)}%. ` +
        `SPI: ${scurveData.spiIndex.toFixed(2)}`,
      severity: overallSeverity,
      is_read: false,
    });
  }

  // 2. Per-activity schedule delay alerts
  for (const activity of activities) {
    const activityEnd = new Date(activity.end_date);
    const todayDate = new Date(today);

    if (todayDate > activityEnd) {
      // Check if activity is complete
      const activityProgress = dailyProgress
        .filter((dp) => dp.activity_id === activity.id)
        .reduce((sum, dp) => sum + Number(dp.progress_percent), 0);

      if (activityProgress < 100) {
        const daysLate = Math.ceil(
          (todayDate.getTime() - activityEnd.getTime()) / (1000 * 60 * 60 * 24)
        );
        newAlerts.push({
          project_id: projectId,
          activity_id: activity.id,
          type: 'schedule_delay',
          message: `La actividad "${activity.name}" tiene ${daysLate} día(s) de retraso. ` +
            `Fecha fin planificada: ${activity.end_date}. Avance: ${activityProgress.toFixed(1)}%`,
          severity: daysLate > 7 ? 'critical' : daysLate > 3 ? 'warning' : 'info',
          is_read: false,
        });
      }
    }
  }

  return {
    newAlerts,
    spiIndex: scurveData.spiIndex,
    currentDeviation: overallDeviation,
  };
}

/**
 * Saves new alerts to the database, avoiding duplicate alerts
 * for the same activity on the same day.
 */
export async function saveAlerts(
  alerts: Omit<Alert, 'id' | 'created_at'>[]
): Promise<void> {
  const supabase = await createClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  for (const alert of alerts) {
    // Check if a similar alert was already created today
    const { data: existing } = await supabase
      .from('alerts')
      .select('id')
      .eq('project_id', alert.project_id)
      .eq('type', alert.type)
      .gte('created_at', `${today}T00:00:00`)
      .maybeSingle();

    if (!existing) {
      await supabase.from('alerts').insert(alert);
    }
  }
}
