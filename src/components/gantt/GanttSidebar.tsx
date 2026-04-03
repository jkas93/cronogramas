import { useState, useEffect } from 'react';
import { GanttDbType } from '@/lib/gantt/types';
import { format, parseISO } from 'date-fns';

export interface GanttSidebarProps {
  open: boolean;
  onClose: () => void;
  taskId: string;
  dbId: string;
  dbType: GanttDbType | null;
  name: string;
  startDate: string;
  endDate: string;
  weight: string;
  progress: number;
  onSave: (taskId: string, dbType: GanttDbType, dbId: string, updates: Record<string, unknown>) => Promise<void>;
  readonly?: boolean;
}

export function GanttSidebar({
  open,
  onClose,
  taskId,
  dbId,
  dbType,
  name,
  startDate,
  endDate,
  weight,
  progress,
  onSave,
  readonly = false
}: GanttSidebarProps) {
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    weight: '1',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        name: name || '',
        startDate: startDate ? format(parseISO(startDate), 'yyyy-MM-dd') : '',
        endDate: endDate ? format(parseISO(endDate), 'yyyy-MM-dd') : '',
        weight: weight || '1',
      });
    }
  }, [open, name, startDate, endDate, weight]);

  if (!open) return null;

  const handleSave = async () => {
    if (!formData.name.trim() || !taskId || !dbType || !dbId || readonly) return;
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        name: formData.name.trim(),
      };
      
      if (dbType === 'activity') {
        updates.start_date = formData.startDate;
        updates.end_date = formData.endDate;
        updates.weight = parseFloat(formData.weight) || 1;
      }

      await onSave(taskId, dbType, dbId, updates);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 flex justify-end" style={{ zIndex: 200 }}>
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity"
        onClick={!saving ? onClose : undefined}
      />
      
      {/* Panel */}
      <div className="side-panel-content relative w-[380px] h-full bg-white shadow-2xl flex flex-col transform transition-transform duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-[#f8fafc] flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-[#000B1C]">
              {dbType === 'partida' ? 'Editar Partida' : dbType === 'item' ? 'Editar Ítem' : 'Detalles de Actividad'}
            </h3>
            {dbType === 'activity' && (
              <div className="flex items-center gap-2 mt-2 font-medium text-xs">
                <span className="text-gray-500">Progreso actual:</span>
                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  {Math.round(progress * 100)}%
                </span>
              </div>
            )}
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors"
            disabled={saving}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {dbType === 'partida' ? 'Nombre de Partida' : dbType === 'item' ? 'Nombre de Ítem' : 'Nombre de Actividad'}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-900 focus:outline-none transition-all font-['Inter'] ${dbType === 'activity' ? 'bg-gray-50 opacity-60 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`}
              placeholder="Descripción"
              readOnly={readonly || saving || dbType === 'activity'}
            />
          </div>

          {dbType === 'activity' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Inicio</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    readOnly={readonly || saving}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Fin</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    readOnly={readonly || saving}
                  />
                </div>
              </div>
              
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/50">
                <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2 flex items-center justify-between">
                  <span>Peso (Curva S)</span>
                  <span className="text-blue-500 opacity-70">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full pl-3 pr-8 py-2 bg-blue-50/30 border border-blue-200/60 rounded-lg text-[13px] font-bold text-blue-900/50 cursor-not-allowed focus:outline-none transition-all"
                    readOnly={true}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-blue-400 font-medium text-xs">
                    pts
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-blue-600/70 leading-tight">
                  Proporción de esta actividad en el progreso global de la obra.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!readonly && (
          <div className="px-6 py-4 border-t border-gray-100 bg-[#f8fafc] flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formData.name.trim()}
              className="flex-1 px-4 py-2 bg-[#F7C20E] text-[#000B1C] rounded-lg text-sm font-bold shadow-sm shadow-[#F7C20E]/20 hover:bg-[#fad956] hover:-translate-y-px transition-all disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-slate-900/20 border-t-slate-900 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                'Guardar Cambios'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
