import React from 'react';
import { EnhancedPartida, EditedValues, EditedValue } from './types';
import { PulseActivityRow } from './PulseActivityRow';

interface PulseTableProps {
  activeActivitiesByPartida: EnhancedPartida[];
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
  editedValues: EditedValues;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFieldChange: (activityId: string, field: keyof EditedValue, value: any) => void;
  onRemoveFile: (activityId: string, idx: number) => void;
}

export function PulseTable({
  activeActivitiesByPartida,
  expandedRows,
  onToggleRow,
  editedValues,
  onFieldChange,
  onRemoveFile
}: PulseTableProps) {
  if (activeActivitiesByPartida.length === 0) {
    return (
      <div className="glass-card p-24 text-center border-dashed border-2 border-surface-800/10 shadow-inner">
        <div className="w-20 h-20 bg-surface-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border border-surface-800">
          <svg className="w-10 h-10 text-surface-400 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-black text-surface-200 tracking-wider mb-2">SIN ACTIVIDADES PROGRAMADAS</h3>
        <p className="text-sm text-surface-400 max-w-sm mx-auto font-medium">No se encontraron tareas bajo contrato para esta fecha. Cambia de fecha o revisa tu cronograma base.</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden border border-surface-800/50 shadow-2xl rounded-2xl bg-surface-950/20 backdrop-blur-xl">
      <div className="w-full overflow-x-auto selection:bg-accent-500/30">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-surface-900/80 border-b-2 border-surface-800/50 text-[10px] font-black text-surface-400 uppercase tracking-[0.2em] shadow-sm">
              <th className="py-5 px-6 w-full min-w-[250px]">Actividad / Tarea</th>
              <th className="py-5 px-4 w-28 text-center">Peso</th>
              <th className="py-5 px-4 w-36 border-l border-surface-800 text-center">Acumulado</th>
              <th className="py-5 px-6 w-44 text-center bg-accent-500/5 text-accent-400 ring-inset ring-1 ring-accent-400/10">Avance Hoy (%)</th>
              <th className="py-5 px-4 w-28 text-center">Gestión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800/30">
            {activeActivitiesByPartida.map((partida) => (
              <React.Fragment key={partida.id}>
                {/* Partida Header */}
                <tr className="sticky top-0 z-10">
                  <td colSpan={5} className="py-3 px-6 bg-gradient-to-r from-primary-700/80 to-primary-800/80 backdrop-blur-md border-y border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_white]"></div>
                      <span className="font-black text-white text-[11px] tracking-[0.25em] uppercase drop-shadow-md">{partida.name}</span>
                    </div>
                  </td>
                </tr>
                
                {partida.items.map((item) => (
                  <React.Fragment key={item.id}>
                    {/* Item header line */}
                    <tr>
                       <td colSpan={5} className="py-2.5 px-6 bg-surface-900/60 pl-8 border-b border-surface-800/40">
                         <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-surface-600"></div>
                           <span className="font-bold text-surface-300 text-[11px] tracking-tight">{item.name}</span>
                         </div>
                       </td>
                    </tr>

                    {/* Activities */}
                    {item.activities.map((activity) => (
                      <PulseActivityRow
                        key={activity.id}
                        activity={activity}
                        isExpanded={expandedRows.has(activity.id)}
                        onToggleExpand={() => onToggleRow(activity.id)}
                        editState={editedValues[activity.id]}
                        onFieldChange={(field, value) => onFieldChange(activity.id, field, value)}
                        onRemoveFile={(idx) => onRemoveFile(activity.id, idx)}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
