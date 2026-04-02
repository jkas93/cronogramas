export const GANTT_LOCALE_ES = {
  date: {
    month_full: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
    month_short: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
    day_full: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
    day_short: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
  },
  labels: {
    new_task: "Nueva tarea",
    icon_save: "Guardar",
    icon_cancel: "Cancelar",
    icon_details: "Detalles",
    icon_edit: "Editar",
    icon_delete: "Eliminar",
    confirm_closing: "",
    confirm_deleting: "¿Eliminar tarea permanentemente?",
    section_description: "Descripción",
    section_time: "Período",
    section_type: "Tipo"
  }
};

export const GANTT_ZOOM_CONFIG = {
  levels: [
    {
      name: "day",
      scale_height: 60,
      min_column_width: 35,
      scales: [
        { unit: "month", step: 1, format: "%F %Y" },
        {
          unit: "day",
          step: 1,
          format: (date: Date) => {
            const dias = ["D", "L", "M", "X", "J", "V", "S"];
            return `<div style="line-height:1;display:flex;flex-direction:column;align-items:center;padding-top:4px;gap:2px;">
                      <span style="font-size:10px;color:rgba(100,116,139,0.8);">${dias[date.getDay()]}</span>
                      <span style="font-size:11px;color:var(--color-surface-100);font-weight:700;">${date.getDate()}</span>
                    </div>`;
          }
        }
      ]
    },
    {
      name: "week",
      scale_height: 60,
      min_column_width: 50,
      scales: [
        { unit: "month", step: 1, format: "%F %Y" },
        {
          unit: "week",
          step: 1,
          format: (date: Date, ganttDateToStr: (format: string) => (date: Date) => string) => {
            const formatStr = ganttDateToStr("%W");
            return `<div style="font-size:11px;color:rgba(100,116,139,0.9);padding-top:2px;">Sem ${formatStr(date)}</div>`;
          }
        }
      ]
    },
    {
      name: "month",
      scale_height: 60,
      min_column_width: 50,
      scales: [
        { unit: "year", step: 1, format: "%Y" },
        { unit: "month", step: 1, format: "%M" }
      ]
    }
  ]
};

export function getTaskClass(_start: Date, _end: Date, task: { db_type: string; progress: number }): string {
  if (task.db_type === 'partida') return 'is-partida-bar';
  if (task.db_type === 'item') return 'is-item-bar';
  if (task.progress >= 1) return 'completed-task';
  return 'in-progress-task';
}

export const GANTT_COLUMNS = (readonly: boolean) => [
  {
    name: 'text',
    label: 'ACTIVIDAD / DESCRIPCIÓN',
    tree: true,
    width: '*',
    template: (task: { db_type: string; $editing?: boolean; id: string; text: string }) => {
      const titleColor = task.db_type === 'partida' ? 'color: #334155; font-weight: bold;' : (task.db_type === 'item' ? 'color: #475569; font-weight: 600;' : 'color: #60a5fa; font-weight: 500;');
      
      const addIcon = `<svg style="width:14px;height:14px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>`;
      const editIcon = `<svg style="width:14px;height:14px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>`;
      const trashIcon = `<svg style="width:14px;height:14px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>`;
      const checkIcon = `<svg style="width:14px;height:14px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>`;

      if (task.$editing && !readonly) {
        return `
          <div class="inline-edit-row" style="display:flex;align-items:center;width:100%;height:100%;padding:0 4px;margin-right:8px;">
            <div style="flex:1;display:flex;align-items:center;height:24px;background:#ffffff;border:1.5px solid #2563eb;border-radius:6px;padding:0 4px 0 8px;gap:2px;">
              <input class="inline-edit-input" data-id="${task.id}" value="${task.text}" style="flex:1;height:100%;border:none;outline:none;font-size:13px;font-family:'Inter', sans-serif;letter-spacing:-0.02em;background:transparent;color:#1e293b;padding:0;" />
              <button class="inline-save-btn" style="background:#2563eb;color:white;border:none;border-radius:4px;width:18px;height:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;flex-shrink:0;">${checkIcon}</button>
            </div>
          </div>
        `;
      }

      return `
        <div class="gantt-custom-cell" style="display:flex;align-items:center;line-height:1.3;width:100%;height:100%;padding-right:12px;gap:8px;">
          ${!readonly && task.db_type !== 'activity' ? `
            <div class="action-btn" data-action="add" style="cursor:pointer;padding:4px;border-radius:6px;color:#64748b;display:flex;align-items:center;transition:all 0.2s;background:rgba(100,116,139,0.05);" title="Añadir elemento debajo">${addIcon}</div>
          ` : ''}
          <div class="gantt-clickable-text" style="display:flex;flex-direction:column;flex:1;overflow:hidden;cursor:text;padding:4px 0;">
            <span style="${titleColor} overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;" title="${task.text}">${task.text}</span>
          </div>
          ${!readonly ? `
          <div class="gantt-actions-container" style="display:flex;gap:8px;align-items:center;opacity:0;transition:opacity 0.2s;">
             <div class="action-btn" data-action="edit" style="cursor:pointer;padding:4px;border-radius:6px;background:#F7C20E;color:#000B1C;display:flex;align-items:center;" title="Editar">${editIcon}</div>
             <div class="action-btn" data-action="delete" style="cursor:pointer;padding:4px;border-radius:6px;color:#ef4444;display:flex;align-items:center;" title="Eliminar">${trashIcon}</div>
          </div>
          ` : ''}
        </div>
      `;
    }
  }
];
