import { useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { isSameDay, format } from 'date-fns';

export function useGanttMarkers() {
  const supabase = useSupabase();

  /**
   * Carga los hitos del proyecto y agrega tanto los hitos como el marcador de "HOY".
   * Este método maneja las limpiezas de marcadores previamente inyectados
   * resolviendo el bug de las líneas rojas duplicadas del diagnóstico.
   */
  const syncMarkers = useCallback(async (ganttInstance: any, projectId: string) => {
    if (!ganttInstance || !projectId) return;

    try {
      // 1. Limpiar todos los marcadores existentes para asegurar idempotencia
      const existingMarkers = ganttInstance.getMarkers() || [];
      existingMarkers.forEach((m: any) => ganttInstance.deleteMarker(m.id));

      // 2. Fetch milestones from Supabase
      const { data: milestones, error } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', projectId);

      if (error) {
        console.error('Error fetching milestones for markers:', error);
      }

      // 3. Agregar marcador Hoy
      const today = new Date();
      // Le agregamos 1 dia para que caiga al final del día visualmente en dhtmlx
      const ganttToday = new Date(today);
      ganttToday.setDate(ganttToday.getDate() + 1);

      ganttInstance.addMarker({
        id: 'today_marker_' + Date.now(),
        start_date: ganttToday,
        css: 'today-marker',
        text: 'HOY',
        title: `Hoy: ${format(today, 'dd/MM/yyyy')}`
      });

      // 4. Agregar marcadores Hitos
      if (milestones && milestones.length > 0) {
        milestones.forEach((ms) => {
          // Si el hito coincide con hoy, agregamos un CSS especial
          const msDate = new Date(ms.date);
          const isTodayMilestone = isSameDay(msDate, today);
          
          ganttInstance.addMarker({
            id: `milestone_${ms.id}`,
            start_date: new Date(ms.date),
            css: 'project-milestone',
            text: ms.name,
            title: `${ms.name}: ${format(msDate, 'dd/MM/yyyy')}`
          });
        });
      }

      // 5. Refrescar el render de los marcadores
      ganttInstance.renderMarkers();

    } catch (err) {
      console.error('Failed to sync markers:', err);
    }
  }, [supabase]);

  return {
    syncMarkers
  };
}
