'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { PartidaWithItems, DailyProgress } from '@/lib/types';
import { PulseHeader } from './pulse/PulseHeader';
import { PulseTable } from './pulse/PulseTable';
import { usePulseSave } from './pulse/usePulseSave';
import { EnhancedPartida, EditedValues, EditedValue, EnhancedActivity, EnhancedItem } from './pulse/types';

interface Props {
  projectId: string;
  partidas: PartidaWithItems[];
  dailyProgress?: DailyProgress[];
}

/**
 * Obtener la fecha local correcta en formato yyyy-MM-dd
 * usando Intl.DateTimeFormat para respetar la zona horaria del usuario.
 * Fix #3: Evita que a las 11pm UTC-5 se muestre la fecha del día siguiente.
 */
function getLocalDateString(): string {
  return new Intl.DateTimeFormat('sv-SE').format(new Date());
}

export function DailyPulseView({ projectId, partidas, dailyProgress: initialDailyProgress = [] }: Props) {
  // Fix #3: Usar fecha local correcta
  const [selectedDate, setSelectedDate] = useState(getLocalDateString);
  const [editedValues, setEditedValues] = useState<EditedValues>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [success, setSuccess] = useState(false);

  // Fix #2: Estado local de dailyProgress para optimistic updates
  const [localDailyProgress, setLocalDailyProgress] = useState(initialDailyProgress);

  // Sincronizar con props del servidor cuando llegan datos nuevos (tras router.refresh())
  useEffect(() => {
    setLocalDailyProgress(initialDailyProgress);
  }, [initialDailyProgress]);

  // Fix #4: Rastrear Blob URLs creados para revocarlos correctamente
  const blobUrlsRef = useRef<Set<string>>(new Set());

  // Fix #4: Cleanup de Blob URLs al desmontar
  useEffect(() => {
    const urls = blobUrlsRef.current;
    return () => {
      urls.forEach(url => {
        try { URL.revokeObjectURL(url); } catch {}
      });
      urls.clear();
    };
  }, []);

  // Reset when date changes
  useEffect(() => {
    // Fix #4: Revocar blob URLs al cambiar de fecha
    blobUrlsRef.current.forEach(url => {
      try { URL.revokeObjectURL(url); } catch {}
    });
    blobUrlsRef.current.clear();
    setEditedValues({});
    setExpandedRows(new Set());
    setSuccess(false);
  }, [selectedDate]);

  // Performance - O(1) Map
  const progressByActivity = useMemo(() => {
    const map = new Map<string, DailyProgress[]>();
    localDailyProgress.forEach(dp => {
      const existing = map.get(dp.activity_id) || [];
      existing.push(dp);
      map.set(dp.activity_id, existing);
    });
    return map;
  }, [localDailyProgress]);

  // Map activities with today's state
  const activeActivitiesByPartida = useMemo(() => {
    const active: EnhancedPartida[] = [];
    partidas.forEach((p) => {
      const itemsWithActivities: EnhancedItem[] = [];
      (p.items || []).forEach((i) => {
        const validActivities = (i.activities || []).filter((a) => {
          return a.start_date <= selectedDate && a.end_date >= selectedDate;
        }).map((a): EnhancedActivity => {
          const taskProgressLogs = progressByActivity.get(a.id) || [];
          const totalProgress = taskProgressLogs.reduce((sum, dp) => sum + Number(dp.progress_percent), 0);
          const existingToday = taskProgressLogs.find(dp => dp.date === selectedDate);
          
          return {
            ...a,
            totalProgress,
            existingTodayPercent: existingToday ? Number(existingToday.progress_percent) : null,
            existingTodayNotes: existingToday?.notes ?? '',
            existingTodayPhotos: (existingToday?.photo_urls as string[]) || [],
            existingTodayRestriction: !!existingToday?.has_restriction,
            existingTodayRestrictionReason: existingToday?.restriction_reason ?? ''
          };
        });

        if (validActivities.length > 0) {
          itemsWithActivities.push({ ...i, activities: validActivities });
        }
      });

      if (itemsWithActivities.length > 0) {
        active.push({ ...p, items: itemsWithActivities });
      }
    });
    return active;
  }, [partidas, selectedDate, progressByActivity]);

  // Stats
  const flatActiveActivitiesCount = useMemo(() => {
    return activeActivitiesByPartida.reduce((sum, p) => 
      sum + p.items.reduce((itemSum: number, i) => itemSum + i.activities.length, 0), 0
    );
  }, [activeActivitiesByPartida]);

  const registeredTodayCount = useMemo(() => {
    let count = 0;
    activeActivitiesByPartida.forEach((p) => {
      p.items.forEach((i) => {
        i.activities.forEach((a) => {
          if (editedValues[a.id]?.percent || a.existingTodayPercent !== null) count++;
        });
      });
    });
    return count;
  }, [activeActivitiesByPartida, editedValues]);

  const activeRestrictionsCount = useMemo(() => {
    let count = 0;
    activeActivitiesByPartida.forEach((p) => {
      p.items.forEach((i) => {
        i.activities.forEach((a) => {
          const isRestricted = editedValues[a.id]?.hasRestriction !== undefined 
            ? editedValues[a.id].hasRestriction 
            : a.existingTodayRestriction;
          if (isRestricted) count++;
        });
      });
    });
    return count;
  }, [activeActivitiesByPartida, editedValues]);

  // Fix #5: Solo contar como "editado" si hay cambios reales (no entradas vacías)
  const hasRealEdits = useMemo(() => {
    return Object.values(editedValues).some(val => 
      (val.percent !== undefined && val.percent !== '') || 
      (val.notes !== undefined && val.notes !== '') || 
      (val.files && val.files.length > 0) || 
      val.hasRestriction !== undefined ||
      (val.restrictionReason !== undefined && val.restrictionReason !== '')
    );
  }, [editedValues]);

  // Handlers
  const handleToggleRow = useCallback((id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateField = useCallback((activityId: string, field: keyof EditedValue, value: any) => {
    setEditedValues(prev => ({
      ...prev,
      [activityId]: {
        ...prev[activityId],
        [field]: value
      }
    }));
  }, []);

  const removeFile = useCallback((activityId: string, idx: number) => {
    setEditedValues(prev => {
      const currentFiles = prev[activityId]?.files || [];
      const nextFiles = currentFiles.filter((_, i) => i !== idx);
      return {
        ...prev,
        [activityId]: { ...prev[activityId], files: nextFiles }
      };
    });
  }, []);

  const changeDate = (days: number) => {
    if (hasRealEdits && !window.confirm('Tienes cambios sin guardar. ¿Deseas descartarlos?')) {
      return;
    }
    const current = new Date(selectedDate + 'T12:00:00'); // Fix #3: Evitar saltos de día por timezone
    current.setDate(current.getDate() + days);
    setSelectedDate(new Intl.DateTimeFormat('sv-SE').format(current));
  };

  // Fix #2: Función de optimistic update — inyectar registros guardados localmente
  const applyOptimisticUpdate = useCallback((savedEditedValues: EditedValues) => {
    setLocalDailyProgress(prev => {
      const updated = [...prev];
      
      Object.entries(savedEditedValues).forEach(([activityId, editVal]) => {
        if (!editVal.percent && editVal.percent !== '0') return;
        
        const existingIdx = updated.findIndex(
          dp => dp.activity_id === activityId && dp.date === selectedDate
        );
        
        const newRecord: DailyProgress = {
          id: `optimistic-${activityId}-${Date.now()}`,
          project_id: projectId,
          activity_id: activityId,
          date: selectedDate,
          progress_percent: parseFloat(editVal.percent || '0'),
          notes: editVal.notes || null,
          photo_urls: [],
          has_restriction: editVal.hasRestriction || false,
          restriction_reason: editVal.restrictionReason || null,
          created_by: null,
          created_at: new Date().toISOString()
        };

        if (existingIdx >= 0) {
          updated[existingIdx] = { ...updated[existingIdx], ...newRecord, id: updated[existingIdx].id };
        } else {
          updated.push(newRecord);
        }
      });

      return updated;
    });
  }, [selectedDate]);

  // Pulse Save Hook
  const { handleSaveAll, loading, error, setError } = usePulseSave({
    projectId,
    selectedDate,
    activeActivitiesByPartida,
    onSaveSuccess: () => {
      // Fix #2: Aplicar optimistic update ANTES de limpiar editedValues
      applyOptimisticUpdate(editedValues);
      
      setSuccess(true);
      setEditedValues({});
      setExpandedRows(new Set());
      
      // Fix #4: Revocar blob URLs de archivos subidos
      blobUrlsRef.current.forEach(url => {
        try { URL.revokeObjectURL(url); } catch {}
      });
      blobUrlsRef.current.clear();
      
      setTimeout(() => setSuccess(false), 3000);
    }
  });

  return (
    <div className="flex flex-col gap-8 pb-12 animate-fade-in">
      <PulseHeader
        selectedDate={selectedDate}
        changeDate={changeDate}
        hasUnsavedEdits={hasRealEdits}
        onDateChange={setSelectedDate}
        registeredTodayCount={registeredTodayCount}
        flatActiveActivitiesCount={flatActiveActivitiesCount}
        activeRestrictionsCount={activeRestrictionsCount}
        loading={loading}
        onSave={() => handleSaveAll(editedValues)}
        hasEditedValues={hasRealEdits}
      />

      {(error || success) && (
        <div className="px-2 animate-slide-up">
          {error && (
            <div className="p-4 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span className="font-bold">{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-danger-400/50 hover:text-danger-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          {success && (
            <div className="p-4 rounded-xl bg-accent-500/10 border border-accent-500/20 text-accent-500 text-sm flex items-center gap-3 shadow-lg">
               <div className="w-6 h-6 rounded-full bg-accent-500/20 flex items-center justify-center">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
               </div>
               <span className="font-black uppercase tracking-tighter">Avances guardados con éxito</span>
            </div>
          )}
        </div>
      )}

      <PulseTable
        activeActivitiesByPartida={activeActivitiesByPartida}
        expandedRows={expandedRows}
        onToggleRow={handleToggleRow}
        editedValues={editedValues}
        onFieldChange={updateField}
        onRemoveFile={removeFile}
      />
    </div>
  );
}
