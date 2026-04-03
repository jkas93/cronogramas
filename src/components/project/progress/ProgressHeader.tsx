import React from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  selectedDate: string;
  isToday: boolean;
  onNavigate: (days: number) => void;
  stats: {
    activitiesCount: number;
    photosCount: number;
    restrictionsCount: number;
  };
}

export function ProgressHeader({ selectedDate, isToday, onNavigate, stats }: Props) {
  const formattedDate = format(parseISO(selectedDate), "EEEE d 'de' MMMM, yyyy", { locale: es });

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-surface-700 flex flex-col md:flex-row gap-6 justify-between items-center relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent-400/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

      <div className="flex items-center gap-4 z-10 w-full md:w-auto justify-between md:justify-start">
        <button 
          onClick={() => onNavigate(-1)} 
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
          onClick={() => onNavigate(1)} 
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
  );
}
