'use client';

import React, { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  project: any;
  partidas: any[];
  dailyProgress: any[];
}

export function PublicDailyProgressView({ project, partidas, dailyProgress = [] }: Props) {
  // Encuentra la fecha más reciente con progreso, o la fecha actual
  const initialDate = useMemo(() => {
    if (dailyProgress.length > 0) {
      // Sort by date descending and get the most recent valid date
      const sorted = [...dailyProgress].sort((a, b) => b.date.localeCompare(a.date));
      return sorted[0].date;
    }
    return new Date().toISOString().split('T')[0];
  }, [dailyProgress]);

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [lightboxIndex, setLightboxIndex] = useState<{ activityId: string, index: number } | null>(null);

  // Filtra y estructura las actividades para la fecha seleccionada
  const dataForSelectedDate = useMemo(() => {
    const active: any[] = [];
    partidas.forEach((p: any) => {
      const itemsWithActivities: any[] = [];
      (p.items || []).forEach((i: any) => {
        const validActivities = (i.activities || []).map((a: any) => {
          // Filtrar progreso del día seleccionado para esta actividad
          const todayProgress = dailyProgress.find(dp => dp.activity_id === a.id && dp.date === selectedDate);
          
          if (!todayProgress || (
            Number(todayProgress.progress_percent) === 0 && 
            !todayProgress.notes && 
            (!todayProgress.photo_urls || todayProgress.photo_urls.length === 0) &&
            !todayProgress.has_restriction
          )) {
            // Solo incluimos actividades que tengan REGISTRO de avance real hoy (notas, fotos, % extra, restricción)
            return null;
          }

          return {
            ...a,
            progressToday: todayProgress.progress_percent,
            notes: todayProgress.notes,
            photos: todayProgress.photo_urls || [],
            hasRestriction: todayProgress.has_restriction || false,
            restrictionReason: todayProgress.restriction_reason || ''
          };
        }).filter(Boolean); // Remover los nulls

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

  // Contadores de resumen
  const stats = useMemo(() => {
    let photosCount = 0;
    let restrictionsCount = 0;
    let activitiesCount = 0;

    dataForSelectedDate.forEach(p => {
      p.items.forEach((i: any) => {
        i.activities.forEach((a: any) => {
          activitiesCount++;
          photosCount += a.photos.length;
          if (a.hasRestriction) restrictionsCount++;
        });
      });
    });

    return { activitiesCount, photosCount, restrictionsCount };
  }, [dataForSelectedDate]);

  const changeDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const formattedDate = format(parseISO(selectedDate), "EEEE d 'de' MMMM, yyyy", { locale: es });
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <div className="flex flex-col gap-6">
      
      {/* Date Navigation & Stats Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-surface-700 flex flex-col md:flex-row gap-6 justify-between items-center relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-400/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

        <div className="flex items-center gap-4 z-10 w-full md:w-auto justify-between md:justify-start">
          <button 
            onClick={() => changeDate(-1)} 
            className="p-3 hover:bg-surface-800 hover:text-primary-500 rounded-full transition-colors flex items-center justify-center border border-surface-700 md:border-transparent bg-white md:bg-transparent shadow-sm md:shadow-none" 
            title="Día anterior"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          
          <div className="flex flex-col items-center min-w-[200px]">
            <label className="text-xs font-semibold tracking-widest text-surface-200/60 uppercase mb-1 flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Fecha de Avance
            </label>
            <div className="text-lg md:text-xl font-bold text-primary-800 capitalize text-center">
              {formattedDate}
            </div>
            {isToday && (
              <span className="mt-1 px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase rounded-full bg-accent-400/10 text-accent-600 border border-accent-400/20">
                Hoy
              </span>
            )}
          </div>

          <button 
            onClick={() => changeDate(1)} 
            className="p-3 hover:bg-surface-800 hover:text-primary-500 rounded-full transition-colors flex items-center justify-center border border-surface-700 md:border-transparent bg-white md:bg-transparent shadow-sm md:shadow-none" 
            title="Día siguiente"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* Stats Summary */}
        <div className="flex flex-wrap gap-4 z-10 w-full md:w-auto justify-center">
          <div className="flex items-center gap-2 bg-surface-50 border border-surface-700 px-4 py-2 rounded-xl">
            <span className="w-8 h-8 rounded-full bg-primary-100/50 flex items-center justify-center text-primary-600 font-bold">
              {stats.activitiesCount}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-surface-300">Actividades<br/>Actualizadas</span>
          </div>

          <div className="flex items-center gap-2 bg-surface-50 border border-surface-700 px-4 py-2 rounded-xl">
            <span className="w-8 h-8 rounded-full bg-accent-400/20 flex items-center justify-center text-accent-600 font-bold">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-surface-300">{stats.photosCount} Fotos<br/>Subidas</span>
          </div>

          {stats.restrictionsCount > 0 && (
            <div className="flex items-center gap-2 bg-danger-500/10 border border-danger-500/30 px-4 py-2 rounded-xl animate-pulse">
              <span className="w-8 h-8 rounded-full bg-danger-500/20 flex items-center justify-center text-danger-500 font-bold">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-danger-500">{stats.restrictionsCount} Restricciones<br/>Activas</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Timeline List */}
      {dataForSelectedDate.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-surface-300 border border-surface-700/50 shadow-sm flex flex-col items-center">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-30 text-surface-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <h3 className="text-lg font-bold text-surface-100 mb-1">Sin Avances Reportados</h3>
          <p className="max-w-md mx-auto">No hay registros de avance físico, fotografías ni notas reportadas para el día {formattedDate}.</p>
        </div>
      ) : (
        <div className="space-y-8 fade-in">
          {dataForSelectedDate.map((partida: any) => (
            <div key={partida.id} className="relative">
              {/* Partida Line Anchor */}
              <div className="absolute left-[27px] top-10 bottom-0 w-0.5 bg-surface-700/50 -z-10 hidden md:block"></div>
              
              <div className="flex items-center gap-3 mb-4 sticky top-0 bg-surface-950/80 backdrop-blur-sm z-20 py-2">
                <div className="w-14 h-14 rounded-2xl bg-primary-600 shadow-md flex items-center justify-center shrink-0 border border-primary-500">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-primary-900">{partida.name}</h2>
                  <p className="text-xs font-semibold uppercase tracking-wider text-surface-200">Partida Principal</p>
                </div>
              </div>

              <div className="pl-4 md:pl-16 space-y-6">
                {partida.items.map((item: any) => (
                  <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-surface-700/60 overflow-hidden transition-all hover:border-surface-600">
                    <div className="bg-surface-50 px-5 py-3 border-b border-surface-700/60">
                      <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        {item.name}
                      </h3>
                    </div>

                    <div className="divide-y divide-surface-700/30">
                      {item.activities.map((activity: any) => (
                        <div key={activity.id} className="p-5 flex flex-col lg:flex-row gap-6">
                           
                           {/* Info & Badges */}
                           <div className="flex-1">
                             <div className="flex items-start justify-between gap-4 mb-3">
                               <h4 className="text-base font-bold text-surface-100">{activity.name}</h4>
                               {activity.progressToday > 0 && (
                                 <span className="shrink-0 inline-flex items-center justify-center px-3 py-1 rounded-full bg-accent-400/10 text-accent-600 font-bold border border-accent-400/20 shadow-sm text-sm whitespace-nowrap">
                                    + {activity.progressToday}% Hoy
                                 </span>
                               )}
                             </div>

                             {/* Restricción */}
                             {activity.hasRestriction && (
                               <div className="mb-4 bg-danger-500/10 border-l-4 border-danger-500 p-3 rounded-r-lg">
                                 <h5 className="text-xs font-bold text-danger-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                   <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                   Restricción Reportada
                                 </h5>
                                 <p className="text-sm text-danger-700/90 font-medium">
                                   {activity.restrictionReason || "Sin justificación detallada."}
                                 </p>
                               </div>
                             )}

                             {/* Comentarios / Notas */}
                             {activity.notes && (
                               <div className="bg-surface-50 border border-surface-700/50 p-3 rounded-xl relative">
                                 <div className="absolute top-3 left-3 text-surface-300">
                                   <svg className="w-5 h-5 opacity-50" fill="currentColor" viewBox="0 0 32 32"><path d="M10 12c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4zm0-6c-1.103 0-2 .897-2 2s.897 2 2 2 2-.897 2-2-.897-2-2-2zm12 6c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4zm0-6c-1.103 0-2 .897-2 2s.897 2 2 2 2-.897 2-2-.897-2-2-2zM2 28v-2.5c0-3.033 2.467-5.5 5.5-5.5h5c3.033 0 5.5 2.467 5.5 5.5V28h-2v-2.5c0-1.93-1.57-3.5-3.5-3.5h-5c-1.93 0-3.5 1.57-3.5 3.5V28H2zm14 0v-2.5c0-3.033 2.467-5.5 5.5-5.5h5c3.033 0 5.5 2.467 5.5 5.5V28h-2v-2.5c0-1.93-1.57-3.5-3.5-3.5h-5c-1.93 0-3.5 1.57-3.5 3.5V28h-2z" /></svg>
                                 </div>
                                 <p className="pl-8 text-sm text-surface-200 whitespace-pre-wrap leading-relaxed">
                                   {activity.notes}
                                 </p>
                               </div>
                             )}
                             
                             {!activity.notes && !activity.hasRestriction && activity.progressToday > 0 && (
                               <p className="text-sm text-surface-300 italic flex items-center gap-1.5 mt-2">
                                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                 Avanzado sin novedades.
                               </p>
                             )}
                           </div>

                           {/* Fotos */}
                           {activity.photos && activity.photos.length > 0 && (
                             <div className="shrink-0 lg:w-[280px]">
                                <h5 className="text-[10px] font-bold text-surface-200 uppercase tracking-widest mb-2 flex items-center justify-between">
                                  <span>Evidencia Fotográfica</span>
                                  <span className="bg-surface-700/50 px-1.5 py-0.5 rounded text-surface-200">{activity.photos.length}</span>
                                </h5>
                                <div className="flex gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
                                  {activity.photos.map((photoUrl: string, idx: number) => (
                                    <div 
                                      key={idx} 
                                      onClick={() => setLightboxIndex({ activityId: activity.id, index: idx })}
                                      className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-surface-700/50 shadow-sm cursor-zoom-in group"
                                    >
                                      <img src={photoUrl} alt="Evidencia de avance" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                                      <div className="absolute inset-0 bg-primary-900/0 group-hover:bg-primary-900/20 transition-colors flex items-center justify-center">
                                         <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 drop-shadow-md transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                             </div>
                           )}

                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LIGHTBOX NATIVO */}
      {lightboxIndex && (
        <div className="photo-lightbox animate-fade-in z-50 fixed inset-0 bg-primary-900/95 backdrop-blur-md flex items-center justify-center flex-col">
          {/* Lightbox Toolbar */}
          <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50">
            <div className="bg-primary-900/50 backdrop-blur-lg px-4 py-2 rounded-full border border-surface-700/20 text-surface-200 text-sm font-semibold tracking-wide">
              {format(parseISO(selectedDate), "dd MMM, yyyy")}
            </div>
            <button 
              onClick={() => setLightboxIndex(null)}
              className="w-12 h-12 rounded-full bg-primary-900/50 border border-surface-700/20 text-white flex items-center justify-center hover:bg-danger-500/20 hover:text-danger-400 hover:border-danger-500/40 transition-all shadow-xl backdrop-blur-lg"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Helper function to get the current open image URL */}
          {(() => {
            const act = dataForSelectedDate.flatMap(p => p.items).flatMap((i: any) => i.activities).find((a: any) => a.id === lightboxIndex.activityId);
            const urls = act?.photos || [];
            const currentUrl = urls[lightboxIndex.index];

            const nextImg = () => {
              if (lightboxIndex.index < urls.length - 1) {
                setLightboxIndex({ ...lightboxIndex, index: lightboxIndex.index + 1 });
              }
            };

            const prevImg = () => {
              if (lightboxIndex.index > 0) {
                setLightboxIndex({ ...lightboxIndex, index: lightboxIndex.index - 1 });
              }
            };

            return (
              <div className="relative w-full max-w-5xl h-full max-h-[80vh] flex items-center justify-center px-4 md:px-12">
                
                {urls.length > 1 && (
                  <button onClick={prevImg} disabled={lightboxIndex.index === 0} className="absolute left-4 z-40 p-4 rounded-full bg-primary-900/50 border border-surface-700/20 text-white disabled:opacity-30 hover:bg-surface-800 disabled:hover:bg-primary-900/50 transition-colors backdrop-blur-lg">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                )}
                
                <img 
                  src={currentUrl} 
                  alt="Avance ampliado" 
                  className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl drag-none select-none transition-transform duration-300" 
                />

                {urls.length > 1 && (
                  <button onClick={nextImg} disabled={lightboxIndex.index === urls.length - 1} className="absolute right-4 z-40 p-4 rounded-full bg-primary-900/50 border border-surface-700/20 text-white disabled:opacity-30 hover:bg-surface-800 disabled:hover:bg-primary-900/50 transition-colors backdrop-blur-lg">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                )}
                
                {/* Dots indicator */}
                {urls.length > 1 && (
                  <div className="absolute bottom-[-3rem] left-0 w-full flex justify-center gap-2">
                    {urls.map((_: any, i: number) => (
                      <button 
                        key={i} 
                        onClick={() => setLightboxIndex({ ...lightboxIndex, index: i })}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${i === lightboxIndex.index ? 'bg-accent-400 w-8' : 'bg-surface-600 hover:bg-surface-400'}`}
                        aria-label={`Ver foto ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
