import React from 'react';

interface PulseHeaderProps {
  selectedDate: string;
  changeDate: (days: number) => void;
  hasUnsavedEdits: boolean;
  onDateChange: (val: string) => void;
  registeredTodayCount: number;
  flatActiveActivitiesCount: number;
  activeRestrictionsCount: number;
  loading: boolean;
  onSave: () => void;
  hasEditedValues: boolean;
}

export function PulseHeader({
  selectedDate,
  changeDate,
  hasUnsavedEdits,
  onDateChange,
  registeredTodayCount,
  flatActiveActivitiesCount,
  activeRestrictionsCount,
  loading,
  onSave,
  hasEditedValues
}: PulseHeaderProps) {
  return (
    <div className="glass-card p-6 flex flex-col md:flex-row gap-4 justify-between items-center bg-surface-900/50">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => changeDate(-1)} 
          className="p-2 hover:bg-surface-800 rounded-full transition-colors group"
          title="Día anterior"
        >
          <svg className="w-5 h-5 text-surface-200 group-hover:text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="flex flex-col items-center">
          <label className="text-[10px] font-bold tracking-[0.2em] text-surface-400 uppercase mb-1">Pulso del Día</label>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => {
                if (hasUnsavedEdits && !window.confirm('Tienes cambios sin guardar. ¿Deseas descartarlos?')) return;
                onDateChange(e.target.value);
              }}
              className="bg-transparent border-none text-xl font-black text-surface-100 outline-none text-center cursor-pointer hover:text-accent-400 transition-colors"
            />
            {activeRestrictionsCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger-500/10 border border-danger-500/20 text-danger-400 text-xs font-black animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {activeRestrictionsCount}
              </div>
            )}
          </div>
        </div>
        
        <button 
          onClick={() => changeDate(1)} 
          className="p-2 hover:bg-surface-800 rounded-full transition-colors group"
          title="Día siguiente"
        >
          <svg className="w-5 h-5 text-surface-200 group-hover:text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="flex-1 max-w-md w-full px-4">
        <div className="flex justify-between text-[11px] mb-2 font-bold uppercase tracking-wider">
          <span className="text-surface-400">Progreso de registro hoy</span>
          <span className="text-accent-400">{registeredTodayCount} / {flatActiveActivitiesCount} activas</span>
        </div>
        <div className="w-full bg-surface-800/50 rounded-full h-3 overflow-hidden border border-surface-700/30">
          <div 
            className="bg-gradient-to-r from-accent-600 to-accent-400 h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(247,194,14,0.3)]" 
            style={{ width: `${flatActiveActivitiesCount > 0 ? (registeredTodayCount / flatActiveActivitiesCount) * 100 : 0}%` }}
          ></div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={onSave} 
          disabled={loading || !hasEditedValues}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2.5 transition-all duration-300 shadow-lg ${
            !hasEditedValues || loading 
              ? 'bg-surface-800 text-surface-500 cursor-not-allowed border border-surface-700/50' 
              : 'bg-accent-500 hover:bg-accent-400 text-surface-900 hover:scale-105 active:scale-95 shadow-accent-500/10'
          }`}
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-surface-900/30 border-t-surface-900 rounded-full animate-spin"></span>
          ) : (
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          )}
          <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
        </button>
      </div>
    </div>
  );
}
