import { useState, useMemo, useCallback } from 'react';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { PartidaWithItems, DailyProgress, PartidaProgress, ItemProgress, ActivityProgress } from '@/lib/types';

/**
 * Hook para gestionar la lógica del visor de avances diarios.
 * Optimiza el rendimiento mediante el uso de Map para búsquedas O(1)
 * y pre-computación de estadísticas.
 */
export function useProjectProgress(
  partidas: PartidaWithItems[],
  dailyProgress: DailyProgress[] = []
) {
  // 1. Encontrar la fecha inicial (más reciente con progreso o hoy)
  const initialDate = useMemo(() => {
    if (dailyProgress.length > 0) {
      const sorted = [...dailyProgress].sort((a, b) => b.date.localeCompare(a.date));
      return sorted[0].date;
    }
    return new Date().toISOString().split('T')[0];
  }, [dailyProgress]);

  const [selectedDate, setSelectedDate] = useState(initialDate);

  // 2. Pre-mapear el progreso diario por fecha y actividad para acceso O(1)
  // Estructura: Map<date, Map<activity_id, DailyProgress>>
  const progressByDateMap = useMemo(() => {
    const mainMap = new Map<string, Map<string, DailyProgress>>();
    
    dailyProgress.forEach((dp) => {
      if (!mainMap.has(dp.date)) {
        mainMap.set(dp.date, new Map<string, DailyProgress>());
      }
      mainMap.get(dp.date)?.set(dp.activity_id, dp);
    });
    
    return mainMap;
  }, [dailyProgress]);

  // 3. Filtrar y estructurar datos para la fecha seleccionada
  const dataForSelectedDate = useMemo(() => {
    const dayMap = progressByDateMap.get(selectedDate);
    if (!dayMap) return [];

    const activePartidas: PartidaProgress[] = [];

    partidas.forEach((p) => {
      const itemsWithActivities: ItemProgress[] = [];
      
      p.items.forEach((item) => {
        const validActivities = item.activities.map((activity) => {
          const todayProgress = dayMap.get(activity.id);
          
          if (!todayProgress) return null;

          // Criterios para mostrar una actividad: progreso, notas, fotos o restricciones
          const hasContent = 
            Number(todayProgress.progress_percent) > 0 || 
            !!todayProgress.notes || 
            (todayProgress.photo_urls && todayProgress.photo_urls.length > 0) ||
            todayProgress.has_restriction;

          if (!hasContent) return null;

          const actProgress: ActivityProgress = {
            id: activity.id,
            name: activity.name,
            progressToday: todayProgress.progress_percent,
            notes: todayProgress.notes,
            photos: todayProgress.photo_urls || [],
            hasRestriction: todayProgress.has_restriction || false,
            restrictionReason: todayProgress.restriction_reason || ''
          };
          return actProgress;
        }).filter((a): a is ActivityProgress => a !== null);

        if (validActivities.length > 0) {
          itemsWithActivities.push({ 
            id: item.id,
            name: item.name, 
            activities: validActivities 
          });
        }
      });

      if (itemsWithActivities.length > 0) {
        activePartidas.push({ 
          id: p.id,
          name: p.name, 
          items: itemsWithActivities 
        });
      }
    });

    return activePartidas;
  }, [partidas, progressByDateMap, selectedDate]);

  // 4. Calcular estadísticas de resumen
  const stats = useMemo(() => {
    let photosCount = 0;
    let restrictionsCount = 0;
    let activitiesCount = 0;

    dataForSelectedDate.forEach(p => {
      p.items.forEach((i) => {
        i.activities.forEach((a) => {
          activitiesCount++;
          photosCount += a.photos.length;
          if (a.hasRestriction) restrictionsCount++;
        });
      });
    });

    return { activitiesCount, photosCount, restrictionsCount };
  }, [dataForSelectedDate]);

  // 5. Utilidades de navegación
  const changeDate = useCallback((days: number) => {
    const current = parseISO(selectedDate);
    const next = days > 0 ? addDays(current, days) : subDays(current, Math.abs(days));
    setSelectedDate(format(next, 'yyyy-MM-dd'));
  }, [selectedDate]);

  const isToday = useMemo(() => {
    return selectedDate === new Date().toISOString().split('T')[0];
  }, [selectedDate]);

  return {
    selectedDate,
    setSelectedDate,
    dataForSelectedDate,
    stats,
    changeDate,
    isToday
  };
}
