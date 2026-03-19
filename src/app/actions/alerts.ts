'use server';

import { createClient } from '@/lib/supabase/server';
import { evaluateAlerts, saveAlerts } from '@/lib/alerts';

/**
 * Trigger alerts evaluation for a specific project.
 * Designed to be called from Client Components after progress updates.
 */
export async function triggerProjectAlerts(projectId: string) {
  const supabase = await createClient();

  // 1. Fetch project
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (!project) return;

  // 2. Fetch all activities
  const { data: partidas } = await supabase
    .from('partidas')
    .select(`
      id,
      items (
        id,
        activities (*)
      )
    `)
    .eq('project_id', projectId);

  const activities = (partidas || [])
    .flatMap((p: any) => p.items || [])
    .flatMap((i: any) => i.activities || []);

  // 3. Fetch all daily progress
  const activityIds = activities.map((a: any) => a.id);
  
  let dailyProgress: any[] = [];
  if (activityIds.length > 0) {
    const { data } = await supabase
      .from('daily_progress')
      .select('*')
      .in('activity_id', activityIds)
      .order('date');
    dailyProgress = data || [];
  }

  // 4. Evaluate alerts
  const { newAlerts } = evaluateAlerts(
    projectId,
    project.start_date,
    project.end_date,
    activities,
    dailyProgress
  );

  // 5. Save if any new
  if (newAlerts.length > 0) {
    await saveAlerts(newAlerts);
  }
}
