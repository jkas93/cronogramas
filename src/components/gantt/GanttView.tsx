'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ImportExcelButton } from './ImportExcelButton';
import { addDays, subDays, parseISO, format } from 'date-fns';
import { MilestoneModal } from './MilestoneModal';
import { PartidaWithItems, DailyProgress as DB_DailyProgress } from '@/lib/types';



interface EditModalState {
  open: boolean;
  taskId: string;
  dbType: 'partida' | 'item' | 'activity' | null;
  name: string;
  startDate: string;
  endDate: string;
  weight: string;
  saving: boolean;
}

interface Props {
  projectId: string;
  partidas: PartidaWithItems[];
  dailyProgress?: DB_DailyProgress[];
  readonly?: boolean;
}

/**
 * GanttView — Renders an interactive Gantt chart using dhtmlx-gantt.
 * Shows the hierarchy: Partida → Item → Activity with editable weights.
 */
export function GanttView({ projectId, partidas, dailyProgress = [], readonly = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ganttInitialized = useRef(false);
  const router = useRouter();
  const supabase = createClient();
  const [zoomLevel, setZoomLevel] = useState('day');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Custom edit modal state
  const [editModal, setEditModal] = useState<EditModalState>({
    open: false,
    taskId: '',
    dbType: null,
    name: '',
    startDate: '',
    endDate: '',
    weight: '1',
    saving: false,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ganttRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || ganttInitialized.current) return;

    const initGantt = async () => {
      // 0. Fetch Milestones & Auth
      const { data: { user } } = await supabase.auth.getUser();
      const { data: proj } = await supabase.from('projects').select('owner_id').eq('id', projectId).single();
      setIsOwner(user?.id === proj?.owner_id);

      const { data: msData } = await supabase.from('project_milestones').select('*').eq('project_id', projectId);
      const currentMilestones = msData || [];

      // 1. Import Gantt
      const ganttModule = await import('dhtmlx-gantt');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gantt: any = ganttModule.gantt || ganttModule.default || ganttModule;
      // @ts-expect-error - CSS modules don't have types but we need the styles for the visual grid
      await import('dhtmlx-gantt/codebase/dhtmlxgantt.css');

      ganttInitialized.current = true;

      // Enable plugins
      gantt.plugins({ marker: true });

      // Localización en Español
      gantt.locale.date = {
        month_full: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
        month_short: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
        day_full: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
        day_short: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
      };

      gantt.locale.labels = {
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
      };

      // Configure Gantt
      gantt.config.date_format = '%Y-%m-%d';
      gantt.config.min_column_width = 40;
      gantt.config.scale_height = 60;
      gantt.config.row_height = 36;
      gantt.config.readonly = false;
      gantt.config.details_on_dblclick = true;
      gantt.config.details_on_create = true;
      gantt.config.open_tree_initially = true;
      gantt.config.show_progress = true;
      gantt.config.fit_tasks = true;
      gantt.config.drag_resize = true;
      gantt.config.drag_move = true;
      gantt.config.drag_move = true;
      gantt.config.drag_progress = false;

      // Tareas parent no pueden cerrarse si queremos que se parezca 100%, pero sí lo dejamos

      // Template for task rows in the grid
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gantt.templates.task_class = function (start: Date, end: Date, task: any) {
        if (task.progress >= 1) return 'completed-task';
        return 'in-progress-task';
      };

      // Add "Today" marker
      gantt.addMarker({
        start_date: new Date(),
        css: "today",
        text: "HOY",
        title: "Día actual"
      });

      // Add Project Milestones as Markers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentMilestones.forEach((m: any) => {
        gantt.addMarker({
          start_date: parseISO(m.date),
          css: "project-milestone",
          text: m.name.toUpperCase(),
          title: m.name
        });
      });

      // Configure Zoom levels
      const zoomConfig = {
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
                format: (date: Date) => {
                  return `<div style="font-size:11px;color:rgba(100,116,139,0.9);padding-top:2px;">Sem ${gantt.date.date_to_str("%W")(date)}</div>`;
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
      gantt.ext.zoom.init(zoomConfig);
      gantt.ext.zoom.setLevel(zoomLevel);

      // Add custom class for parent elements to make them thin & distinct
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gantt.templates.task_class = (start: Date, end: Date, task: any) => {
        if (task.db_type === 'partida') return 'is-partida-bar';
        if (task.db_type === 'item') return 'is-item-bar';
        return '';
      };

      // Configure columns
      gantt.config.readonly = readonly;

      gantt.config.columns = [
        {
          name: 'text',
          label: 'ACTIVIDAD / DESCRIPCIÓN',
          tree: true,
          width: '*',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          template: (task: any) => {
            const prog = Math.round((task.progress || 0) * 100);
            const dur = task.duration || 0;
            // Estilo según foto: letras celestes/azules encendidas. Parent cells are different.
            const titleColor = task.db_type === 'partida' ? 'color: #334155; font-weight: bold;' : (task.db_type === 'item' ? 'color: #475569; font-weight: 600;' : 'color: #60a5fa; font-weight: 500;');
            const weightBadge = task.weight ? `<span style="margin-left:6px;padding:1px 5px;font-size:9px;background:rgba(247,194,14,0.15);color:#F7C20E;border-radius:4px;border:1px solid rgba(247,194,14,0.2);">Peso: ${task.weight}</span>` : '';

            // Iconos CRUD en SVG — solo Add, Edit, Delete
            const addIcon = `<svg style="width:14px;height:14px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>`;
            const editIcon = `<svg style="width:14px;height:14px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>`;
            const trashIcon = `<svg style="width:14px;height:14px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>`;

            return `
              <div class="gantt-custom-cell" style="display:flex;align-items:center;justify-content:space-between;line-height:1.3;width:100%;height:100%;padding-right:12px;">
                <div style="display:flex;flex-direction:column;max-width:${readonly ? '100%' : '72%'};overflow:hidden;">
                  <span style="${titleColor} overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;" title="${task.text}">${task.text} ${weightBadge}</span>
                  <span style="font-size:10px;color:rgba(100,116,139,0.7);margin-top:2px;">${prog}% | ${dur}d</span>
                </div>
                ${!readonly ? `
                <div class="gantt-actions-container" style="display:flex;gap:8px;align-items:center;opacity:0;transition:opacity 0.2s;">
                   <div class="action-btn" data-action="add" style="cursor:pointer;padding:4px;border-radius:6px;color:#64748b;display:flex;align-items:center;" title="Añadir sub-elemento">${addIcon}</div>
                   <div class="action-btn" data-action="edit" style="cursor:pointer;padding:4px;border-radius:6px;background:#F7C20E;color:#000B1C;display:flex;align-items:center;" title="Editar">${editIcon}</div>
                   <div class="action-btn" data-action="delete" style="cursor:pointer;padding:4px;border-radius:6px;color:#ef4444;display:flex;align-items:center;" title="Eliminar">${trashIcon}</div>
                </div>
                ` : ''}
              </div>
            `;
          }
        }
      ];

      // Initialize
      gantt.init(containerRef.current!);

      // Convert data to Gantt format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tasks: any[] = [];

      for (const partida of partidas) {
        tasks.push({
          id: `p_${partida.id}`,
          text: partida.name,
          start_date: null,
          duration: 0,
          open: true,
          db_type: 'partida',
          db_id: partida.id,
          color: '#334155', // Plomo oscuro intenso
          textColor: '#ffffff'
        });

        for (const item of (partida.items || [])) {
          tasks.push({
            id: `i_${item.id}`,
            text: item.name,
            parent: `p_${partida.id}`,
            start_date: null,
            duration: 0,
            open: true,
            db_type: 'item',
            db_id: item.id,
            color: '#64748b', // Plomo intermedio
            textColor: '#ffffff'
          });

          for (const activity of (item.activities || [])) {
            const taskProgressLogs = dailyProgress.filter((dp: DB_DailyProgress) => dp.activity_id === activity.id);
            const totalProgress = taskProgressLogs.reduce((sum: number, dp: DB_DailyProgress) => sum + Number(dp.progress_percent), 0);

            tasks.push({
              id: `a_${activity.id}`,
              text: activity.name,
              parent: `i_${item.id}`,
              start_date: activity.start_date,
              // DHTMLX requires exclusive end dates. We add 1 day so tasks look inclusive on screen.
              end_date: activity.end_date ? format(addDays(parseISO(activity.end_date), 1), 'yyyy-MM-dd') : null,
              weight: activity.weight,
              progress: Math.min(totalProgress / 100, 1),
              color: '#F7C20E', // Golden Tower gold
              progressColor: '#daa90c',
              db_type: 'activity',
              db_id: activity.id,
            });
          }
        }
      }

      gantt.parse({ data: tasks, links: [] });

      // Auto-scroll to today
      setTimeout(() => {
        gantt.showDate(new Date());
      }, 50);

      if (readonly) return;

      // Store gantt ref for use in modal save
      ganttRef.current = gantt;

      // Disable default lightbox (we use our own React modal)
      gantt.config.details_on_dblclick = false;
      gantt.config.details_on_create = false;

      // CRUD Intercepts
      gantt.attachEvent("onTaskClick", (id: string, e: Event) => {
        const target = e.target as HTMLElement;
        const btn = target.closest('.action-btn');
        if (btn) {
          const action = btn.getAttribute('data-action');
          if (action === 'add') {
            gantt.createTask({ text: "Nueva Tarea", duration: 1 }, id);
            return false;
          } else if (action === 'edit') {
            // Open custom branded modal
            const task = gantt.getTask(id);
            // Convert DHTMLX exclusive end_date back to inclusive for display
            const endRaw = task.end_date instanceof Date ? task.end_date : new Date(task.end_date);
            const endInclusive = task.db_type === 'activity' 
              ? format(subDays(endRaw, 1), 'yyyy-MM-dd') 
              : '';
            const startFormatted = task.start_date instanceof Date 
              ? format(task.start_date, 'yyyy-MM-dd') 
              : (task.start_date || '');
              
            setEditModal({
              open: true,
              taskId: id,
              dbType: task.db_type || null,
              name: task.text || '',
              startDate: task.db_type === 'activity' ? startFormatted : '',
              endDate: task.db_type === 'activity' ? endInclusive : '',
              weight: task.weight ? String(task.weight) : '1',
              saving: false,
            });
            return false;
          } else if (action === 'delete') {
            gantt.confirm({
              text: "¿Eliminar permanentemente de la base de datos?",
              ok: "Sí",
              cancel: "No",
              callback: function (result: boolean) {
                if (result) gantt.deleteTask(id);
              }
            });
            return false;
          }
        }
        return true;
      });

      // Configure MS Project style auto-adding and sync
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gantt.attachEvent("onAfterTaskAdd", async (id: string, task: any) => {
        // Determine what level we are at
        const parentTask = task.parent && gantt.isTaskExists(task.parent) ? gantt.getTask(task.parent) : null;

        if (!parentTask) {
          // It's a root task -> Partida
          task.db_type = 'partida';
          task.color = '#0e3366';
          const { data } = await supabase.from('partidas').insert({ project_id: projectId, name: task.text || 'Nueva Partida', sort_order: 0 }).select().single();
          if (data) {
            task.db_id = data.id;
            gantt.changeTaskId(id, `p_${data.id}`);
          }
        } else if (parentTask.db_type === 'partida') {
          // Parent is partida -> Item
          task.db_type = 'item';
          task.color = '#1a4d8f';
          const { data } = await supabase.from('items').insert({ partida_id: parentTask.db_id, name: task.text || 'Nuevo Ítem', sort_order: 0 }).select().single();
          if (data) {
            task.db_id = data.id;
            gantt.changeTaskId(id, `i_${data.id}`);
          }
        } else {
          // Parent is item -> Activity
          task.db_type = 'activity';
          task.color = '#F7C20E';
          const sd = task.start_date || new Date();
          const edRaw = task.end_date || new Date(); // DHTMLX sends an exclusive end date

          // Subtract 1 day so the DB stores the actual working inclusive date
          const edInclusive = subDays(edRaw, 1);

          const { data } = await supabase.from('activities').insert({
            item_id: parentTask.db_id,
            name: task.text || 'Nueva Actividad',
            start_date: format(sd, 'yyyy-MM-dd'),
            end_date: format(edInclusive, 'yyyy-MM-dd'),
            weight: parseFloat(task.weight) || 1
          }).select().single();
          if (data) {
            task.db_id = data.id;
            gantt.changeTaskId(id, `a_${data.id}`);
          }
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gantt.attachEvent("onAfterTaskUpdate", async (id: string, task: any) => {
        if (!task.db_id) return; // Not synced yet

        if (task.db_type === 'partida') {
          await supabase.from('partidas').update({ name: task.text }).eq('id', task.db_id);
        } else if (task.db_type === 'item') {
          await supabase.from('items').update({ name: task.text }).eq('id', task.db_id);
        } else if (task.db_type === 'activity') {
          const sd = task.start_date || new Date();
          const edRaw = task.end_date || new Date();

          // Subtract 1 day so the DB stores the actual working inclusive date
          const edInclusive = subDays(edRaw, 1);

          await supabase.from('activities').update({
            name: task.text,
            start_date: format(sd, 'yyyy-MM-dd'),
            end_date: format(edInclusive, 'yyyy-MM-dd'),
            weight: parseFloat(task.weight) || 1
          }).eq('id', task.db_id);
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gantt.attachEvent("onAfterTaskDelete", async (id: string, task: any) => {
        if (!task.db_id) return;
        if (task.db_type === 'partida') await supabase.from('partidas').delete().eq('id', task.db_id);
        if (task.db_type === 'item') await supabase.from('items').delete().eq('id', task.db_id);
        if (task.db_type === 'activity') await supabase.from('activities').delete().eq('id', task.db_id);
      });
    };

    initGantt();

    return () => {
      if (ganttInitialized.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        import('dhtmlx-gantt').then((mod: any) => {
          const gantt = mod.gantt || mod.default || mod;
          gantt.clearAll();
        });
      }
    };
  }, [partidas, dailyProgress, projectId, readonly, supabase, router, zoomLevel]);

  // Save changes from custom edit modal
  const handleEditSave = async () => {
    if (!editModal.name.trim() || !editModal.taskId) return;
    setEditModal((prev: EditModalState) => ({ ...prev, saving: true }));

    try {
      const gantt = ganttRef.current;
      const task = gantt.getTask(editModal.taskId);

      if (editModal.dbType === 'partida') {
        await supabase.from('partidas').update({ name: editModal.name.trim() }).eq('id', task.db_id);
        task.text = editModal.name.trim();
        gantt.updateTask(editModal.taskId);
      } else if (editModal.dbType === 'item') {
        await supabase.from('items').update({ name: editModal.name.trim() }).eq('id', task.db_id);
        task.text = editModal.name.trim();
        gantt.updateTask(editModal.taskId);
      } else if (editModal.dbType === 'activity') {
        if (!editModal.startDate || !editModal.endDate) return;
        const sd = parseISO(editModal.startDate);
        const ed = parseISO(editModal.endDate);
        await supabase.from('activities').update({
          name: editModal.name.trim(),
          start_date: editModal.startDate,
          end_date: editModal.endDate,
          weight: parseFloat(editModal.weight) || 1,
        }).eq('id', task.db_id);
        task.text = editModal.name.trim();
        task.start_date = format(sd, 'yyyy-MM-dd');
        task.end_date = format(addDays(ed, 1), 'yyyy-MM-dd');
        task.weight = parseFloat(editModal.weight) || 1;
        gantt.updateTask(editModal.taskId);
      }

      setEditModal((prev: EditModalState) => ({ ...prev, open: false, saving: false }));
      router.refresh();
    } catch (err) {
      console.error(err);
      setEditModal((prev: EditModalState) => ({ ...prev, saving: false }));
    }
  };

  // Handle Zoom change safely
  const handleZoomChange = (level: string) => {
    setZoomLevel(level);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import('dhtmlx-gantt').then((mod: any) => {
      const gantt = mod.gantt || mod.default || mod;
      gantt.ext.zoom.setLevel(level);
    });
  };

  // Label for the modal header
  const editModalLabel = 
    editModal.dbType === 'partida' ? 'Editar Partida' : 
    editModal.dbType === 'item' ? 'Editar Ítem' : 'Editar Actividad';

  return (
    <>
    <div className={isFullscreen ? "fixed inset-0 z-[100] bg-surface-50 p-2 md:p-4 flex flex-col h-screen w-screen" : "flex flex-col h-full"}>
      <div className="flex flex-row items-center gap-3 mb-4 shrink-0 overflow-x-auto scrollbar-hide py-1">

        <div className="flex items-center gap-2 flex-nowrap shrink-0">
          {/* Zoom Toggle */}
          <div className="flex bg-surface-800 rounded-lg p-1 border border-surface-700/50 flex-shrink-0 shadow-sm">
            <button
              onClick={() => handleZoomChange('day')}
              className={`px-3 py-1 text-[10px] md:text-xs rounded-md font-semibold transition-all ${zoomLevel === 'day' ? 'bg-primary-600 text-white shadow-sm' : 'text-surface-300 hover:text-primary-500 hover:bg-primary-500/10'}`}
            >
              <span className="hidden sm:inline">Días</span>
              <span className="sm:hidden">D</span>
            </button>
            <button
              onClick={() => handleZoomChange('week')}
              className={`px-3 py-1 text-[10px] md:text-xs rounded-md font-semibold transition-all ${zoomLevel === 'week' ? 'bg-primary-600 text-white shadow-sm' : 'text-surface-300 hover:text-primary-500 hover:bg-primary-500/10'}`}
            >
              <span className="hidden sm:inline">Semanas</span>
              <span className="sm:hidden">S</span>
            </button>
            <button
              onClick={() => handleZoomChange('month')}
              className={`px-3 py-1 text-[10px] md:text-xs rounded-md font-semibold transition-all ${zoomLevel === 'month' ? 'bg-primary-600 text-white shadow-sm' : 'text-surface-300 hover:text-primary-500 hover:bg-primary-500/10'}`}
            >
              <span className="hidden sm:inline">Meses</span>
              <span className="sm:hidden">M</span>
            </button>
          </div>

          <div className="w-px h-6 bg-surface-700/50 mx-1 flex-shrink-0"></div>

          {/* Sincronizar */}
          {!readonly && (
            <button
              onClick={() => router.refresh()}
              title="Sincronizar datos"
              className="p-1.5 md:p-2 border border-primary-500/20 text-primary-400 bg-primary-500/5 hover:bg-primary-500 hover:text-white rounded-lg transition-all flex-shrink-0 shadow-sm"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          )}

          {/* Resetear */}
          {!readonly && (
            <button
              onClick={async () => {
                if (window.confirm("¿Seguro que deseas ELIMINAR TODAS las partidas de este diagrama? Esta acción borrará el diagrama completo y no se puede deshacer.")) {
                  try {
                    await supabase.from('partidas').delete().eq('project_id', projectId);
                    router.refresh();
                  } catch { }
                }
              }}
              className="p-1.5 md:p-2 border border-danger-500/20 text-danger-500 bg-danger-500/5 hover:bg-danger-500 hover:text-white rounded-lg transition-all flex-shrink-0 shadow-sm"
              title="Resetear todo el diagrama"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          )}

          {/* Pantalla Completa */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 md:p-2 border border-accent-400/20 text-accent-500 bg-accent-400/5 hover:bg-accent-400 hover:text-primary-900 rounded-lg transition-all flex-shrink-0 shadow-sm"
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={isFullscreen ? "M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 15v4.5m0-4.5h4.5m-4.5 0l5.25 5.25M15 9V4.5m0 4.5h4.5M15 9l5.25-5.25M9 15v4.5m0-4.5H4.5m4.5 0l-5.25 5.25" : "M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15"} />
            </svg>
          </button>

          <div className="w-px h-6 bg-surface-700/50 mx-1 flex-shrink-0"></div>

          {!readonly && (
            <MilestoneModal
              projectId={projectId}
              isOwner={isOwner}
              onUpdate={() => router.refresh()}
            />
          )}

          {!readonly && <ImportExcelButton projectId={projectId} />}
        </div>
      </div>

      {/* Gantt chart container */}
      <div className={`glass-card overflow-hidden gantt-dark-theme-wrapper border-b-0 rounded-b-none ${isFullscreen ? 'flex-1' : 'h-[600px] min-h-[500px]'}`}>
        <style dangerouslySetInnerHTML={{
          __html: `
          .gantt-dark-theme-wrapper .gantt_row:hover .gantt-actions-container {
             opacity: 1 !important;
          }
          
          /* Modificar partidas e items - Convertidas en barras normales finas (sin corchetes raros) */
          .gantt-dark-theme-wrapper .gantt_task_line.is-partida-bar {
             height: 12px !important;
             line-height: 12px !important;
             margin-top: 10px !important;
             border-radius: 4px !important;
             background-color: #334155 !important; /* Fuerza Plomo Oscuro para borrar dorado residual inline */
             border: 1px solid rgba(0,0,0,0.4) !important;
             box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
          }
          .gantt-dark-theme-wrapper .gantt_task_line.is-item-bar {
             height: 8px !important;
             line-height: 8px !important;
             margin-top: 12px !important;
             border-radius: 3px !important;
             background-color: #64748b !important; /* Fuerza Plomo Intermedio */
             border: 1px solid rgba(0,0,0,0.2) !important;
             box-shadow: none !important;
          }
          /* Actividades normales */
          .gantt-dark-theme-wrapper .gantt_task_line:not(.is-partida-bar):not(.is-item-bar) {
             height: 20px !important;
             line-height: 20px !important;
             margin-top: 8px !important;
             border-radius: 4px !important;
          }
          .gantt-dark-theme-wrapper .is-partida-bar .gantt_task_content,
          .gantt-dark-theme-wrapper .is-item-bar .gantt_task_content {
             display: none !important; /* Esconder posible texto flotante de progreso de dhtmlx */
          }

          .gantt-dark-theme-wrapper .gantt_task_cell.week_end {
            background-color: rgba(0, 0, 0, 0.02); /* Ajustado para el Light theme global */
          }
          .gantt-dark-theme-wrapper .gantt_task_row.gantt_selected .gantt_task_cell {
            border-right-color: rgba(0, 0, 0, 0.02);
            background-color: rgba(59, 130, 246, 0.05) !important;
          }
          .gantt-dark-theme-wrapper .gantt_grid_data .gantt_row.gantt_selected {
            background-color: rgba(59, 130, 246, 0.05) !important;
          }
          .gantt-dark-theme-wrapper .gantt_marker.today {
            background: #F7C20E;
          }
          .gantt-dark-theme-wrapper .gantt_marker.today .gantt_marker_content {
            position: sticky !important;
            background: #F7C20E;
            color: #000B1C;
            border-radius: 6px;
            padding: 2px 8px;
            font-size: 10px;
            font-weight: 800;
            top: 62px !important; /* Debajo de la escala de tiempo */
            transform: translateX(-50%);
            box-shadow: 0 4px 10px rgba(247, 194, 14, 0.3);
            z-index: 20;
            width: max-content;
            white-space: nowrap;
            display: inline-block;
          }
          .gantt-dark-theme-wrapper .gantt_scale_cell {
            color: rgba(176, 188, 206, 0.6);
            font-size: 11px;
            letter-spacing: 0.5px;
          }
          .gantt-dark-theme-wrapper .gantt_grid_scale .gantt_grid_head_cell {
            color: rgba(247, 194, 14, 0.7);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-size: 11px;
            text-align: left;
            padding-left: 20px;
          }
          .gantt-dark-theme-wrapper .gantt_task_line.completed-task {
            background: linear-gradient(135deg, #10b981, #059669) !important;
            border-color: #059669 !important;
          }
          .gantt-dark-theme-wrapper .gantt_task_line.in-progress-task {
            /* Uses default golden from globals.css */
          }

          /* Estilo P.U.L.S.O. - Hitos de Proyecto (Líneas Verticales) */
          .gantt-dark-theme-wrapper .gantt_marker.project-milestone {
            background: transparent;
            width: 3px;
            z-index: 10;
            transition: all 0.3s ease;
          }
          
          .gantt_marker.project-milestone:hover {
            background: rgba(247, 194, 14, 0.15) !important;
          }
          
          .gantt-dark-theme-wrapper .gantt_marker.project-milestone .gantt_marker_content {
            background: #F7C20E;
            color: #000B1C;
            border: 1.5px solid #ffffff;
            border-radius: 4px; /* Se verá como rombo al rotar */
            width: 12px;
            height: 12px;
            top: 60px !important; /* Justo debajo del header */
            transform: rotate(45deg) translateX(-25%);
            box-shadow: 0 4px 10px rgba(247, 194, 14, 0.4);
            cursor: pointer;
            transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
            white-space: nowrap;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0; /* Esconde texto por defecto */
            text-indent: -9999px;
            z-index: 50;
          }

          .gantt-dark-theme-wrapper .gantt_marker.project-milestone:hover .gantt_marker_content {
            transform: rotate(0deg) translateX(-50%);
            width: fit-content;
            height: auto;
            min-height: 24px;
            padding: 4px 14px;
            font-size: 11px;
            font-weight: 800;
            text-indent: 0;
            border-radius: 8px;
            box-shadow: 0 8px 24px rgba(247, 194, 14, 0.6);
            letter-spacing: 0.5px;
          }

          /* Línea punteada dorada de alta visibilidad */
          .gantt-dark-theme-wrapper .gantt_marker.project-milestone::after {
            content: '';
            position: absolute;
            top: 0;
            bottom: 0;
            left: 0;
            right: 0;
            background-image: linear-gradient(to bottom, #F7C20E 60%, transparent 60%);
            background-size: 2px 14px;
            background-repeat: repeat-y;
            opacity: 0.5;
            transition: opacity 0.3s, transform 0.3s;
          }

          .gantt-dark-theme-wrapper .gantt_marker.project-milestone:hover::after {
            opacity: 1;
            transform: scaleX(1.5);
            background-image: linear-gradient(to bottom, #F7C20E 100%, #F7C20E 100%);
          }
        `}} />
        <div
          ref={containerRef}
          className="w-full h-full"
        />
      </div>
      {/* Legend Footer */}
      <div className="bg-surface-800 border gap-4 border-surface-700/50 p-2 flex justify-end items-center rounded-b-xl text-[10px] font-bold text-surface-200/50 uppercase tracking-widest">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-surface-600"></div>
          <span>En Progreso</span>
        </div>
        <div className="flex items-center gap-1.5 mr-4">
          <div className="w-2.5 h-2.5 rounded-full bg-accent-500"></div>
          <span className="text-accent-400">Completado</span>
        </div>
      </div>
    </div>

    {/* ── Custom Edit Modal ── */}
    {editModal.open && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden fade-in">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span style={{ background: 'linear-gradient(135deg,#F7C20E,#daa90c)', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 800, color: '#000B1C', letterSpacing: '0.05em' }}>
                {editModal.dbType?.toUpperCase()}
              </span>
              {editModalLabel}
            </h3>
            <button 
              onClick={() => setEditModal((prev: EditModalState) => ({ ...prev, open: false }))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre</label>
              <input 
                type="text" 
                value={editModal.name}
                onChange={e => setEditModal(prev => ({ ...prev, name: e.target.value }))}
                className="input-field"
                placeholder={`Nombre de la ${editModal.dbType}...`}
                autoFocus
              />
            </div>

            {/* Dates + Weight — only for activities */}
            {editModal.dbType === 'activity' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha inicio</label>
                    <input 
                      type="date" 
                      value={editModal.startDate}
                      onChange={e => setEditModal(prev => ({ ...prev, startDate: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha fin</label>
                    <input 
                      type="date" 
                      value={editModal.endDate}
                      onChange={e => setEditModal(prev => ({ ...prev, endDate: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Peso / Ponderación
                    <span className="ml-1 text-slate-400 font-normal normal-case">(0.01 – 100)</span>
                  </label>
                  <input 
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={editModal.weight}
                    onChange={e => setEditModal(prev => ({ ...prev, weight: e.target.value }))}
                    className="input-field"
                    placeholder="Ej: 5.5"
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
            <button 
              onClick={handleEditSave}
              disabled={editModal.saving || !editModal.name.trim()}
              className="btn-primary flex-1"
            >
              {editModal.saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button 
              onClick={() => setEditModal((prev: EditModalState) => ({ ...prev, open: false }))}
              className="btn-secondary px-5"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
