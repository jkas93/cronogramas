import { useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { format } from 'date-fns';

export function useGanttMarkers() {
  const supabase = useSupabase();

  /**
   * Carga los hitos del proyecto y agrega tanto los hitos como el marcador de "HOY".
   * Este método maneja las limpiezas de marcadores previamente inyectados
   * resolviendo el bug de las líneas rojas duplicadas del diagnóstico.
   */
  const syncMarkers = useCallback(async (ganttInstance: Record<string, unknown>, projectId: string) => {
    if (!ganttInstance || !projectId) return;

    try {
      // 1. Limpiar todos los marcadores existentes para asegurar idempotencia
      const getMarkers = ganttInstance.getMarkers as () => Array<{id: string}>;
      const deleteMarker = ganttInstance.deleteMarker as (id: string) => void;
      const addMarker = ganttInstance.addMarker as (marker: Record<string, unknown>) => void;
      const renderMarkers = ganttInstance.renderMarkers as () => void;

      const existingMarkers = getMarkers ? getMarkers() : [];
      existingMarkers.forEach((m) => {
        if (deleteMarker) deleteMarker(m.id);
      });

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

      if (addMarker) {
        addMarker({
          id: 'today_marker_' + Date.now(),
          start_date: ganttToday,
          css: 'today-marker',
          text: 'HOY',
          title: `Hoy: ${format(today, 'dd/MM/yyyy')}`
        });
      }

      // 4. Agregar marcadores Hitos
      if (milestones && milestones.length > 0) {
        milestones.forEach((ms) => {
          // Si el hito coincide con hoy, agregamos un CSS especial
          const msDate = new Date(ms.date);
          
          if (addMarker) {
            addMarker({
              id: `milestone_${ms.id}`,
              start_date: new Date(ms.date),
              css: 'project-milestone',
              text: ms.name,
              title: `${ms.name}: ${format(msDate, 'dd/MM/yyyy')}`
            });
          }
        });
      }

      // 5. Refrescar el render de los marcadores
      if (renderMarkers) renderMarkers();

    } catch (err) {
      console.error('Failed to sync markers:', err);
    }
  }, [supabase]);

  return {
    syncMarkers
  };
}
