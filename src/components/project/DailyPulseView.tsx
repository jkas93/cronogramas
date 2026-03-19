'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { triggerProjectAlerts } from '@/app/actions/alerts';

interface Props {
  projectId: string;
  partidas: any[];
  dailyProgress?: any[];
}

export function DailyPulseView({ projectId, partidas, dailyProgress = [] }: Props) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [editedValues, setEditedValues] = useState<Record<string, { percent: string, notes: string, files: File[] }>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  // Reset edited values when date changes
  useEffect(() => {
    setEditedValues({});
    setExpandedRows(new Set());
    setError(null);
    setSuccess(false);
  }, [selectedDate]);

  // Flatten and filter activities active on the selected date
  const activeActivitiesByPartida = useMemo(() => {
    const active: any[] = [];
    partidas.forEach((p: any) => {
      const itemsWithActivities: any[] = [];
      (p.items || []).forEach((i: any) => {
        const validActivities = (i.activities || []).filter((a: any) => {
          return a.start_date <= selectedDate && a.end_date >= selectedDate;
        }).map((a: any) => {
          const taskProgressLogs = dailyProgress.filter(dp => dp.activity_id === a.id);
          const totalProgress = taskProgressLogs.reduce((sum, dp) => sum + Number(dp.progress_percent), 0);
          const existingToday = taskProgressLogs.find(dp => dp.date === selectedDate);
          
          return {
            ...a,
            totalProgress,
            existingTodayPercent: existingToday ? existingToday.progress_percent : null,
            existingTodayNotes: existingToday ? existingToday.notes : '',
            existingTodayPhotos: existingToday ? existingToday.photo_urls : []
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
  }, [partidas, dailyProgress, selectedDate]);

  const flatActiveActivitiesCount = useMemo(() => {
    return activeActivitiesByPartida.reduce((sum, p) => 
      sum + p.items.reduce((itemSum: number, i: any) => itemSum + i.activities.length, 0), 0
    );
  }, [activeActivitiesByPartida]);

  const registeredTodayCount = useMemo(() => {
    let count = 0;
    activeActivitiesByPartida.forEach((p) => {
      p.items.forEach((i: any) => {
        i.activities.forEach((a: any) => {
          if (editedValues[a.id]?.percent || a.existingTodayPercent !== null) {
            count++;
          }
        });
      });
    });
    return count;
  }, [activeActivitiesByPartida, editedValues]);

  const handlePercentChange = (activityId: string, value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [activityId]: { ...prev[activityId], percent: value, notes: prev[activityId]?.notes || '', files: prev[activityId]?.files || [] }
    }));
  };

  const handleNotesChange = (activityId: string, value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [activityId]: { ...prev[activityId], percent: prev[activityId]?.percent || '', notes: value, files: prev[activityId]?.files || [] }
    }));
  };

  const handleFileChange = (activityId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setEditedValues(prev => {
        const currentFiles = prev[activityId]?.files || [];
        if (currentFiles.length + selectedFiles.length > 3) {
          alert('Máximo 3 fotos por actividad');
          return prev;
        }
        return {
          ...prev,
          [activityId]: { ...prev[activityId], percent: prev[activityId]?.percent || '', notes: prev[activityId]?.notes || '', files: [...currentFiles, ...selectedFiles].slice(0, 3) }
        };
      });
    }
  };

  const removeFile = (activityId: string, index: number) => {
    setEditedValues(prev => ({
      ...prev,
      [activityId]: {
        ...prev[activityId],
        files: prev[activityId].files.filter((_, i) => i !== index)
      }
    }));
  };

  const toggleRowExpanded = (activityId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  const changeDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleSaveAll = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const activitiesToSave = Object.keys(editedValues).filter(id => editedValues[id].percent !== '');

      if (activitiesToSave.length === 0) {
        throw new Error("No hay cambios para guardar.");
      }

      // Validations
      for (const activityId of activitiesToSave) {
        // Find activity in flat list
        let activityInfo: any = null;
        activeActivitiesByPartida.forEach((p) => {
          p.items.forEach((i: any) => {
            const found = i.activities.find((a: any) => a.id === activityId);
            if (found) activityInfo = found;
          });
        });

        if (activityInfo) {
          const proposedPercent = parseFloat(editedValues[activityId].percent);
          const previousTodayPercent = activityInfo.existingTodayPercent ? Number(activityInfo.existingTodayPercent) : 0;
          const accumulatedWithoutToday = activityInfo.totalProgress - previousTodayPercent;

          if (accumulatedWithoutToday + proposedPercent > 100) {
            throw new Error(`Progreso inválido en "${activityInfo.name}". Acumulado > 100%.`);
          }
        }
      }

      const promises = activitiesToSave.map(async (activityId) => {
        const { percent, notes, files } = editedValues[activityId];
        const photoUrls: string[] = [];
        
        // Find existing activity info to keep old photos if we didn't add new ones? 
        // For simplicity, we append new files to existing photos, but handling deletions of old photos is complex.
        // Let's just upload new ones and append them to existing if any.
        let activityInfo: any = null;
        activeActivitiesByPartida.forEach((p) => {
          p.items.forEach((i: any) => {
            const found = i.activities.find((a: any) => a.id === activityId);
            if (found) activityInfo = found;
          });
        });
        
        const existingPhotos = activityInfo?.existingTodayPhotos || [];

        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${projectId}/${activityId}/${selectedDate}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const { error: uploadError, data } = await supabase.storage
            .from('evidence')
            .upload(fileName, file);

          if (!uploadError && data?.path) {
            const { data: publicUrlData } = supabase.storage.from('evidence').getPublicUrl(data.path);
            photoUrls.push(publicUrlData.publicUrl);
          }
        }

        const finalPhotos = [...existingPhotos, ...photoUrls];

        const { error: insertError } = await supabase
          .from('daily_progress')
          .upsert(
            {
              activity_id: activityId,
              date: selectedDate,
              progress_percent: parseFloat(percent),
              notes: notes || null,
              created_by: user?.id,
              photo_urls: finalPhotos
            },
            { onConflict: 'activity_id,date' }
          );

        if (insertError) {
          if (insertError.message.includes('photo_urls') || insertError.details?.includes('photo_urls') || insertError.message.includes('schema cache')) {
             await supabase
              .from('daily_progress')
              .upsert(
                {
                  activity_id: activityId,
                  date: selectedDate,
                  progress_percent: parseFloat(percent),
                  notes: notes || null,
                  created_by: user?.id,
                },
                { onConflict: 'activity_id,date' }
              );
          } else {
             throw insertError;
          }
        }
      });

      await Promise.all(promises);
      
      setSuccess(true);
      setEditedValues({});
      setExpandedRows(new Set());
      triggerProjectAlerts(projectId).catch(console.error);
      
      setTimeout(() => setSuccess(false), 3000);
      router.refresh();
      
    } catch (err: any) {
      setError(err.message || 'Error al guardar los avances.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex flex-col gap-6">
      {/* HEADER / PULSE CONTROL */}
      <div className="glass-card p-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => changeDate(-1)} className="p-2 hover:bg-surface-800 rounded-full transition-colors" title="Día anterior">
            <svg className="w-5 h-5 text-surface-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex flex-col items-center">
            <label className="text-xs font-semibold tracking-wider text-surface-200/60 uppercase mb-1">Pulso del Día</label>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-lg font-bold text-surface-100 outline-none text-center cursor-pointer"
            />
          </div>
          <button onClick={() => changeDate(1)} className="p-2 hover:bg-surface-800 rounded-full transition-colors" title="Día siguiente">
            <svg className="w-5 h-5 text-surface-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        <div className="flex-1 max-w-md w-full">
          <div className="flex justify-between text-xs mb-1.5 font-medium">
            <span className="text-surface-200">Progreso de registro hoy</span>
            <span className="text-accent-400">{registeredTodayCount} / {flatActiveActivitiesCount} activas</span>
          </div>
          <div className="w-full bg-surface-800 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-accent-400 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${flatActiveActivitiesCount > 0 ? (registeredTodayCount / flatActiveActivitiesCount) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleSaveAll} 
            disabled={loading || Object.keys(editedValues).length === 0}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            {loading ? <span className="spinner w-4 h-4 border-2" /> : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            )}
            Guardar Cambios
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-success-500/10 border border-success-500/20 text-success-500 text-sm flex items-center gap-3">
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
           Avances guardados correctamente.
        </div>
      )}

      {/* COMPACT TABLE */}
      <div className="glass-card overflow-hidden">
        {activeActivitiesByPartida.length === 0 ? (
          <div className="p-12 text-center text-surface-200">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p>No hay actividades programadas para esta fecha.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-800/50 border-b border-surface-700/50 text-xs font-semibold text-surface-200 uppercase tracking-wider">
                  <th className="py-3 px-4">Actividad</th>
                  <th className="py-3 px-4 w-24 text-center">Peso</th>
                  <th className="py-3 px-4 w-32 border-l border-surface-700/30 text-center">Acumulado</th>
                  <th className="py-3 px-4 w-40 text-center bg-accent-400/5 text-accent-400/80">Hoy (%)</th>
                  <th className="py-3 px-4 w-28 text-center text-surface-300">Detalles</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {activeActivitiesByPartida.map((partida: any) => (
                  <React.Fragment key={partida.id}>
                    {/* Partida Header */}
                    <tr>
                      <td colSpan={5} className="py-2 px-4 bg-primary-600 border-y border-primary-700/50">
                        <span className="font-bold text-white text-xs tracking-wider uppercase">{partida.name}</span>
                      </td>
                    </tr>
                    
                    {partida.items.map((item: any) => (
                      <React.Fragment key={item.id}>
                        {/* Item line */}
                        <tr>
                           <td colSpan={5} className="py-1.5 px-4 bg-surface-800/80 pl-6 border-b border-surface-700/50">
                             <span className="font-semibold text-surface-200 text-xs">{item.name}</span>
                           </td>
                        </tr>

                        {/* Activities */}
                        {item.activities.map((activity: any) => {
                          const isExpanded = expandedRows.has(activity.id);
                          const editState = editedValues[activity.id];
                          const hasUnsavedChanges = editState?.percent !== undefined || editState?.notes !== undefined || (editState?.files && editState.files.length > 0);
                          
                          const displayPercent = editState?.percent !== undefined 
                            ? editState.percent 
                            : (activity.existingTodayPercent !== null ? activity.existingTodayPercent.toString() : '');

                          return (
                            <React.Fragment key={activity.id}>
                              <tr className={`hover:bg-surface-800/30 transition-colors border-b border-surface-700/50 ${hasUnsavedChanges ? 'bg-accent-400/5' : ''}`}>
                                <td className="py-3 px-4 pl-8">
                                  <div className="flex items-center gap-2">
                                    <span className="text-surface-100 font-medium">{activity.name}</span>
                                    {hasUnsavedChanges && <span className="w-1.5 h-1.5 rounded-full bg-accent-400"></span>}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center text-surface-200 font-mono text-xs">
                                  {activity.weight}
                                </td>
                                <td className="py-3 px-4 text-center border-l border-surface-700/30">
                                  <span className="px-2 py-1 rounded-md bg-surface-800 text-surface-200 text-xs font-semibold">
                                    {activity.totalProgress.toFixed(1)}%
                                  </span>
                                </td>
                                <td className="py-2 px-4 bg-accent-400/5 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <input 
                                      type="number" 
                                      min="0" max="100" step="0.5"
                                      placeholder="0"
                                      value={displayPercent}
                                      onChange={(e) => handlePercentChange(activity.id, e.target.value)}
                                      className="w-16 h-8 text-center text-sm font-semibold rounded-md bg-white border border-surface-600 focus:border-accent-400 focus:ring-1 focus:ring-accent-400 outline-none transition-colors text-surface-100"
                                    />
                                    <span className="text-surface-300 font-bold">%</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <button 
                                    onClick={() => toggleRowExpanded(activity.id)}
                                    className={`p-1.5 rounded-md transition-colors relative ${isExpanded ? 'bg-surface-700 text-surface-100' : 'text-surface-300 hover:bg-surface-800 hover:text-surface-200'}`}
                                    title="Añadir notas o fotos"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    {(activity.existingTodayNotes || activity.existingTodayPhotos.length > 0 || editState?.notes || (editState?.files && editState.files.length > 0)) && (
                                       <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-accent-400 rounded-full border border-surface-900"></span>
                                    )}
                                  </button>
                                </td>
                              </tr>
                              
                              {/* Expanded Row for Notes & Photos */}
                              {isExpanded && (
                                <tr className="bg-surface-800/50 border-b border-surface-700/50">
                                  <td colSpan={5} className="py-4 px-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-900 p-4 rounded-xl border border-surface-700/50 shadow-inner">
                                      {/* Notas */}
                                      <div>
                                        <label className="block text-xs font-semibold text-surface-200 uppercase tracking-wider mb-2">Notas del día</label>
                                        <textarea
                                          value={editState?.notes !== undefined ? editState.notes : activity.existingTodayNotes}
                                          onChange={(e) => handleNotesChange(activity.id, e.target.value)}
                                          placeholder="Añadir observaciones..."
                                          className="w-full text-sm bg-surface-800 border border-surface-700 rounded-lg p-3 outline-none focus:border-accent-400 text-surface-100 resize-none h-24"
                                        />
                                      </div>
                                      
                                      {/* Fotos */}
                                      <div>
                                        <label className="block text-xs font-semibold text-surface-200 uppercase tracking-wider mb-2 flex justify-between items-center">
                                          <span>Evidencia fotográfica</span>
                                          <label className="text-accent-500 hover:text-accent-400 cursor-pointer text-xs font-bold bg-accent-400/10 px-2 py-1 rounded-md transition-colors">
                                            + Subir <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFileChange(activity.id, e)} />
                                          </label>
                                        </label>
                                        
                                        <div className="flex gap-3 overflow-x-auto pb-2 min-h-[80px] p-2 bg-surface-800 rounded-lg border border-surface-700 border-dashed">
                                           {activity.existingTodayPhotos.map((url: string, idx: number) => (
                                              <div key={`old-${idx}`} className="relative w-16 h-16 rounded-md overflow-hidden shrink-0 border border-surface-600">
                                                <img src={url} alt="Evidencia" className="w-full h-full object-cover" />
                                              </div>
                                           ))}
                                           {editState?.files?.map((file, idx) => (
                                              <div key={`new-${idx}`} className="relative w-16 h-16 rounded-md overflow-hidden shrink-0 border border-accent-400 group">
                                                <img src={URL.createObjectURL(file)} alt="Nueva evidencia" className="w-full h-full object-cover opacity-80" />
                                                <button onClick={() => removeFile(activity.id, idx)} className="absolute inset-0 m-auto w-6 h-6 bg-red-500 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                              </div>
                                           ))}
                                           {activity.existingTodayPhotos.length === 0 && (!editState?.files || editState.files.length === 0) && (
                                              <div className="flex w-full items-center justify-center text-xs text-surface-300">
                                                Sin fotos para este día
                                              </div>
                                           )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
