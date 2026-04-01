'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ImportExcelButton } from './ImportExcelButton';
import { addDays, subDays, parseISO, format } from 'date-fns';
import { MilestoneModal } from './MilestoneModal';
import { PartidaWithItems, DailyProgress as DB_DailyProgress } from '@/lib/types';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';

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

export function GanttView({ projectId, partidas, dailyProgress = [], readonly = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ganttInitialized = useRef(false);
  const router = useRouter();
  const supabase = createClient();
  const [zoomLevel, setZoomLevel] = useState('day');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

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
    const initGantt = async () => {
      const ganttModule = await import('dhtmlx-gantt');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gantt: any = ganttModule.gantt || ganttModule.default || ganttModule;

      if (!ganttInitialized.current) {
        // Essential: register plugins BEFORE init but after the object is available
        gantt.plugins({ marker: true });

        const { data: { user } } = await supabase.auth.getUser();
        const { data: proj } = await supabase.from('projects').select('owner_id').eq('id', projectId).single();
        setIsOwner(user?.id === proj?.owner_id);

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
        gantt.config.drag_progress = false;

        // Enable Branch Ordering (Drag & Drop in Grid)
        gantt.config.order_branch = true;
        gantt.config.order_branch_free = true;

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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        gantt.templates.task_class = (start: Date, end: Date, task: any) => {
          if (task.db_type === 'partida') return 'is-partida-bar';
          if (task.db_type === 'item') return 'is-item-bar';
          if (task.progress >= 1) return 'completed-task';
          return 'in-progress-task';
        };

        gantt.config.columns = [
          {
            name: 'text',
            label: 'ACTIVIDAD / DESCRIPCIÓN',
            tree: true,
            width: '*',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            template: (task: any) => {
              const titleColor = task.db_type === 'partida' ? 'color: #334155; font-weight: bold;' : (task.db_type === 'item' ? 'color: #475569; font-weight: 600;' : 'color: #60a5fa; font-weight: 500;');
              
              const addIcon = `<svg style="width:14px;height:14px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>`;
              const editIcon = `<svg style="width:14px;height:14px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>`;
              const trashIcon = `<svg style="width:14px;height:14px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>`;
              const checkIcon = `<svg style="width:14px;height:14px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>`;

              if (task.$editing) {
                return `
                  <div class="inline-edit-row" style="display:flex;align-items:center;width:100%;height:100%;padding:2px 4px;gap:4px;">
                    <input class="inline-edit-input" data-id="${task.id}" value="${task.text}" style="flex:1;height:24px;border:1.5px solid #2563eb;border-radius:6px;padding:0 8px;font-size:12px;outline:none;" />
                    <button class="inline-save-btn" style="background:#2563eb;color:white;border:none;border-radius:4px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background 0.2s;">${checkIcon}</button>
                  </div>
                `;
              }

              return `
                <div class="gantt-custom-cell" style="display:flex;align-items:center;line-height:1.3;width:100%;height:100%;padding-right:12px;gap:8px;">
                  ${!readonly ? `
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

        gantt.init(containerRef.current!);
        ganttInitialized.current = true;
        ganttRef.current = gantt;

        if (!readonly) {
          gantt.config.details_on_dblclick = false;
          gantt.config.details_on_create = false;

          gantt.attachEvent("onTaskClick", (id: string, e: Event) => {
            const target = e.target as HTMLElement;
            const btn = target.closest('.action-btn');
            const saveBtn = target.closest('.inline-save-btn');
            const task = gantt.getTask(id);

            // Handle Save Inline
            if (saveBtn) {
              const row = target.closest('.inline-edit-row');
              const input = row?.querySelector('input') as HTMLInputElement;
              if (input) {
                const newValue = input.value.trim();
                if (newValue) {
                  task.text = newValue;
                  task.$editing = false;
                  gantt.updateTask(id); // This triggers onAfterTaskUpdate
                }
              }
              return false;
            }

            if (btn) {
              const action = btn.getAttribute('data-action');
              if (action === 'add') {
                const index = gantt.getTaskIndex(id);
                gantt.createTask({ text: "Nueva Tarea", duration: 1 }, task.parent, index + 1);
                return false;
              } else if (action === 'edit') {
                // Open Side Panel for detailed editing (dates, weight)
                const endRaw = task.end_date instanceof Date ? task.end_date : new Date(task.end_date);
                const endInclusive = task.db_type === 'activity' ? format(subDays(endRaw, 1), 'yyyy-MM-dd') : '';
                const startFormatted = task.start_date instanceof Date ? format(task.start_date, 'yyyy-MM-dd') : (task.start_date || '');
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

            // Click on text area (not an action button) triggers inline edit
            if (!task.$editing && !readonly && target.closest('.gantt-clickable-text')) {
              task.$editing = true;
              gantt.refreshTask(id);
              setTimeout(() => {
                const input = document.querySelector(`.inline-edit-input[data-id="${id}"]`) as HTMLInputElement;
                if (input) {
                  input.focus();
                  input.select();
                }
              }, 10);
              return false;
            }
            
            return true;
          });

          // --- Drag & Drop Constraints (No nesting) ---
          gantt.attachEvent("onBeforeTaskMove", (id: string, parent: string) => {
            const task = gantt.getTask(id);
            const parentTask = parent && gantt.isTaskExists(parent) ? gantt.getTask(parent) : null;

            // Rule 1: Partidas must stay at the root
            if (task.db_type === 'partida' && parent) return false;

            // Rule 2: Items can only be under Partidas
            if (task.db_type === 'item' && (!parentTask || parentTask.db_type !== 'partida')) return false;

            // Rule 3: Activities can only be under Items
            if (task.db_type === 'activity' && (!parentTask || parentTask.db_type !== 'item')) return false;

            return true;
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          gantt.attachEvent("onAfterTaskAdd", async (id: string, task: any) => {
            const parentTask = task.parent && gantt.isTaskExists(task.parent) ? gantt.getTask(task.parent) : null;
            const siblingsCount = gantt.getChildren(task.parent || '').length;

            if (!parentTask) {
              task.db_type = 'partida';
              const { data } = await supabase.from('partidas').insert({ 
                project_id: projectId, 
                name: task.text || 'Nueva Partida', 
                sort_order: siblingsCount 
              }).select().single();
              if (data) { task.db_id = data.id; gantt.changeTaskId(id, `p_${data.id}`); }
            } else if (parentTask.db_type === 'partida') {
              task.db_type = 'item';
              const { data } = await supabase.from('items').insert({ 
                partida_id: parentTask.db_id, 
                name: task.text || 'Nuevo Ítem', 
                sort_order: siblingsCount 
              }).select().single();
              if (data) { task.db_id = data.id; gantt.changeTaskId(id, `i_${data.id}`); }
            } else {
              task.db_type = 'activity';
              const sd = task.start_date || new Date();
              const edRaw = task.end_date || new Date();
              const ed = format(subDays(edRaw, 1), 'yyyy-MM-dd');
              const { data } = await supabase.from('activities').insert({ 
                item_id: parentTask.db_id, 
                name: task.text || 'Nueva Actividad', 
                start_date: format(sd, 'yyyy-MM-dd'), 
                end_date: ed, 
                weight: 1, 
                sort_order: siblingsCount 
              }).select().single();
              if (data) { task.db_id = data.id; gantt.changeTaskId(id, `a_${data.id}`); }
            }
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          gantt.attachEvent("onAfterTaskUpdate", async (id: string, task: any) => {
            if (!task.db_id) return;
            if (task.db_type === 'partida') { await supabase.from('partidas').update({ name: task.text }).eq('id', task.db_id); }
            else if (task.db_type === 'item') { await supabase.from('items').update({ name: task.text }).eq('id', task.db_id); }
            else if (task.db_type === 'activity') {
              const sd = task.start_date || new Date();
              const edRaw = task.end_date || new Date();
              const edInclusive = subDays(edRaw, 1);
              await supabase.from('activities').update({ name: task.text, start_date: format(sd, 'yyyy-MM-dd'), end_date: format(edInclusive, 'yyyy-MM-dd'), weight: parseFloat(task.weight) || 1 }).eq('id', task.db_id);
            }
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          gantt.attachEvent("onAfterTaskDelete", async (id: string, task: any) => {
            if (!task.db_id) return;
            if (task.db_type === 'partida') await supabase.from('partidas').delete().eq('id', task.db_id);
            if (task.db_type === 'item') await supabase.from('items').delete().eq('id', task.db_id);
            if (task.db_type === 'activity') await supabase.from('activities').delete().eq('id', task.db_id);
          });

          // Persistent Drag & Drop (Branch Ordering)
          gantt.attachEvent("onAfterTaskMove", async (id: string, parent: string) => {
            const task = gantt.getTask(id);
            const parentTask = parent && gantt.isTaskExists(parent) ? gantt.getTask(parent) : null;
            
            // 1. Update sort_order for all affected siblings
            const siblings = gantt.getChildren(parent);
            await Promise.all(siblings.map((sid: string, index: number) => {
              const sTask = gantt.getTask(sid);
              if (!sTask.db_id) return Promise.resolve();
              
              const table = sTask.db_type === 'partida' ? 'partidas' : (sTask.db_type === 'item' ? 'items' : 'activities');
              return supabase.from(table).update({ sort_order: index }).eq('id', sTask.db_id);
            }));

            // 2. If moved between parents (only for Activities/Items)
            if (task.db_type === 'item' && parentTask?.db_type === 'partida') {
              await supabase.from('items').update({ partida_id: parentTask.db_id }).eq('id', task.db_id);
            } else if (task.db_type === 'activity' && parentTask?.db_type === 'item') {
              await supabase.from('activities').update({ item_id: parentTask.db_id }).eq('id', task.db_id);
            }
          });
        }
      }

      gantt.config.readonly = readonly;
      gantt.ext.zoom.setLevel(zoomLevel);

      // --- Markers Logic (Always run to ensure visibility) ---
      const { data: msData } = await supabase.from('project_milestones').select('*').eq('project_id', projectId);
      const currentMilestones = msData || [];

      // Completely clear existing markers before adding
      gantt.deleteMarker("today_marker");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentMilestones.forEach((m: any) => gantt.deleteMarker(`ms_${m.id}`));

      // Add "Today" marker (Matching S-Curve color: #f43f5e)
      gantt.addMarker({
        id: "today_marker",
        start_date: new Date(),
        css: "today",
        text: "HOY",
        title: "Día actual"
      });

      // Add Project Milestones (Matching S-Curve color: #F7C20E)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentMilestones.forEach((m: any) => {
        gantt.addMarker({
          id: `ms_${m.id}`,
          start_date: parseISO(m.date),
          css: "project-milestone",
          text: m.name.toUpperCase(),
          title: m.name
        });
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tasks: any[] = [];
      const sortedPartidas = [...partidas].sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));

      for (const partida of sortedPartidas) {
        tasks.push({
          id: `p_${partida.id}`,
          text: partida.name,
          start_date: null,
          duration: 0,
          open: true,
          db_type: 'partida',
          db_id: partida.id,
          color: '#334155',
          textColor: '#ffffff'
        });

        const sortedItems = [...(partida.items || [])].sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));

        for (const item of sortedItems) {
          tasks.push({
            id: `i_${item.id}`,
            text: item.name,
            parent: `p_${partida.id}`,
            start_date: null,
            duration: 0,
            open: true,
            db_type: 'item',
            db_id: item.id,
            color: '#64748b',
            textColor: '#ffffff'
          });

          const sortedActivities = [...(item.activities || [])].sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));

          for (const activity of sortedActivities) {
            const taskProgressLogs = dailyProgress.filter((dp: DB_DailyProgress) => dp.activity_id === activity.id);
            const totalProgress = taskProgressLogs.reduce((sum: number, dp: DB_DailyProgress) => sum + Number(dp.progress_percent), 0);

            tasks.push({
              id: `a_${activity.id}`,
              text: activity.name,
              parent: `i_${item.id}`,
              start_date: activity.start_date,
              end_date: activity.end_date ? format(addDays(parseISO(activity.end_date), 1), 'yyyy-MM-dd') : null,
              weight: activity.weight,
              progress: Math.min(totalProgress / 100, 1),
              color: '#F7C20E',
              progressColor: '#daa90c',
              db_type: 'activity',
              db_id: activity.id,
            });
          }
        }
      }

      gantt.clearAll();
      gantt.parse({ data: tasks, links: [] });
      
      // Auto-fit Gantt range after parsing tasks
      gantt.render();

      // Ensure 'Today' is visible after data load
      setTimeout(() => {
        gantt.showDate(new Date());
      }, 100);
    };

    initGantt();

    return () => {
    };
  }, [partidas, dailyProgress, projectId, readonly, supabase, router, zoomLevel]);

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
        task.start_date = sd;
        task.end_date = addDays(ed, 1);
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

  const handleZoomChange = (level: string) => {
    setZoomLevel(level);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import('dhtmlx-gantt').then((mod: any) => {
      const gantt = mod.gantt || mod.default || mod;
      gantt.ext.zoom.setLevel(level);
    });
  };

  return (
    <>
    <div className={isFullscreen ? "fixed inset-0 z-[100] bg-surface-50 p-2 md:p-4 flex flex-col h-screen w-screen" : "flex flex-col h-full"}>
      <div className="flex flex-row items-center gap-3 mb-4 shrink-0 overflow-x-auto scrollbar-hide py-1">
        <div className="flex items-center gap-2 flex-nowrap shrink-0">
          <div className="flex bg-surface-800 rounded-lg p-1 border border-surface-700/50 flex-shrink-0 shadow-sm">
            <button key="zoom-day" onClick={() => handleZoomChange('day')} className={`px-3 py-1 text-[10px] md:text-xs rounded-md font-semibold transition-all ${zoomLevel === 'day' ? 'bg-primary-600 text-white' : 'text-surface-300'}`}>
              <span className="hidden sm:inline">Días</span>
              <span className="sm:hidden">D</span>
            </button>
            <button key="zoom-week" onClick={() => handleZoomChange('week')} className={`px-3 py-1 text-[10px] md:text-xs rounded-md font-semibold transition-all ${zoomLevel === 'week' ? 'bg-primary-600 text-white' : 'text-surface-300'}`}>
              <span className="hidden sm:inline">Semanas</span>
              <span className="sm:hidden">S</span>
            </button>
            <button key="zoom-month" onClick={() => handleZoomChange('month')} className={`px-3 py-1 text-[10px] md:text-xs rounded-md font-semibold transition-all ${zoomLevel === 'month' ? 'bg-primary-600 text-white' : 'text-surface-300'}`}>
              <span className="hidden sm:inline">Meses</span>
              <span className="sm:hidden">M</span>
            </button>
          </div>

          <div className="w-px h-6 bg-surface-700/50 mx-1 flex-shrink-0"></div>

          {!readonly && <button onClick={() => router.refresh()} className="p-2 border border-primary-500/20 text-primary-400 bg-primary-500/5 rounded-lg shadow-sm"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>}
          
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 border border-accent-400/20 text-accent-500 bg-accent-400/5 rounded-lg shadow-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={isFullscreen ? "M9 9V4.5M9 9H4.5" : "M3.75 3.75v4.5m0-4.5h4.5"} />
            </svg>
          </button>
          
          <div className="w-px h-6 bg-surface-700/50 mx-1 flex-shrink-0"></div>
          {!readonly && <MilestoneModal projectId={projectId} isOwner={isOwner} onUpdate={() => router.refresh()} />}
          {!readonly && <ImportExcelButton projectId={projectId} />}
        </div>
      </div>

      <div className={`glass-card overflow-hidden gantt-dark-theme-wrapper border-b-0 rounded-b-none ${isFullscreen ? 'flex-1' : 'h-[600px] min-h-[500px]'}`}>
        <style dangerouslySetInnerHTML={{
          __html: `
          .gantt-dark-theme-wrapper .gantt_row:hover .gantt-actions-container { opacity: 1 !important; }
          .gantt-dark-theme-wrapper .gantt_task_line.is-partida-bar { height: 12px !important; margin-top: 10px !important; border-radius: 4px !important; background-color: #334155 !important; }
          .gantt-dark-theme-wrapper .gantt_task_line.is-item-bar { height: 8px !important; margin-top: 12px !important; border-radius: 3px !important; background-color: #64748b !important; }
          
          .inline-save-btn:hover { background: #1d4ed8 !important; }
          .inline-edit-input:focus { box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2); }
          
          /* Side Panel (Drawer) Styles */
          .side-panel-overlay {
            background: rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(2px);
          }
          .side-panel-content {
            box-shadow: -10px 0 30px rgba(0,0,0,0.15);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .side-panel-enter { transform: translateX(100%); }
          .side-panel-enter-active { transform: translateX(0); }
          .side-panel-exit { transform: translateX(0); }
          .side-panel-exit-active { transform: translateX(100%); }
          
          /* Visualización de Marcadores (Líneas de Hoy e Hitos) - Referencia con Curva S */
          .gantt-dark-theme-wrapper .gantt_marker {
            width: 3px !important;
            z-index: 99 !important;
            visibility: visible !important;
            display: block !important;
          }
          .gantt-dark-theme-wrapper .gantt_marker.today { 
            background-color: #f43f5e !important; 
          }
          .gantt-dark-theme-wrapper .gantt_marker.today .gantt_marker_content { 
            position: sticky !important; 
            background: #f43f5e; 
            color: #ffffff; 
            border-radius: 6px; 
            padding: 4px 10px; 
            font-size: 11px; 
            font-weight: 900; 
            top: 62px !important; 
            transform: translateX(-50%); 
            z-index: 101; 
            white-space: nowrap;
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          }
          .gantt-dark-theme-wrapper .gantt_marker.project-milestone { 
            background: transparent; 
            z-index: 90 !important; 
          }
          .gantt-dark-theme-wrapper .gantt_marker.project-milestone .gantt_marker_content { 
            background: #F7C20E; 
            color: #000B1C; 
            border: 2px solid #ffffff; 
            border-radius: 4px; 
            width: 14px; 
            height: 14px; 
            top: 60px !important; 
            transform: rotate(45deg) translateX(-25%); 
            z-index: 101; 
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          }
          .gantt-dark-theme-wrapper .gantt_marker.project-milestone::after { 
            content: ''; 
            position: absolute; 
            top:0; 
            bottom:0; 
            left:0; 
            right:0; 
            background-image: linear-gradient(to bottom, #F7C20E 60%, transparent 10%); 
            background-size: 3px 14px; 
            background-repeat: repeat-y; 
            opacity: 1 !important; 
          }
        `}} />
        <div ref={containerRef} className="w-full h-full" />
      </div>

      <div className="bg-surface-800 border gap-4 border-surface-700/50 p-2 flex justify-end items-center rounded-b-xl text-[10px] font-bold text-surface-200/50 uppercase tracking-widest">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-surface-600"></div><span>En Progreso</span></div>
        <div className="flex items-center gap-1.5 mr-4"><div className="w-2.5 h-2.5 rounded-full bg-accent-500"></div><span className="text-accent-400">Completado</span></div>
      </div>
    </div>

    {editModal.open && (
      <div 
        className="fixed inset-0 z-[200] flex justify-end side-panel-overlay animate-in fade-in duration-300"
        onClick={() => setEditModal(prev => ({ ...prev, open: false }))}
      >
        <div 
          className="bg-white h-full w-full max-w-sm side-panel-content animate-in slide-in-from-right duration-300 p-0 flex flex-col shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50 shrink-0">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Detalles de Tarea</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{editModal.dbType}</p>
            </div>
            <button 
              onClick={() => setEditModal(prev => ({ ...prev, open: false }))} 
              className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre de Actividad</label>
                <textarea 
                  value={editModal.name} 
                  onChange={e => setEditModal(prev => ({ ...prev, name: e.target.value }))} 
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all resize-none font-medium text-slate-700 min-h-[80px]"
                />
              </div>

              {editModal.dbType === 'activity' && (
                <>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Fecha Inicio</label>
                      <input 
                        type="date" 
                        value={editModal.startDate} 
                        onChange={e => setEditModal(prev => ({ ...prev, startDate: e.target.value }))} 
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Fecha Fin</label>
                      <input 
                        type="date" 
                        value={editModal.endDate} 
                        onChange={e => setEditModal(prev => ({ ...prev, endDate: e.target.value }))} 
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Peso en el cronograma (%)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.1" 
                        value={editModal.weight} 
                        onChange={e => setEditModal(prev => ({ ...prev, weight: e.target.value }))} 
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all pr-12" 
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Visual Guide */}
            <div className="p-4 bg-primary-500/5 border border-primary-500/10 rounded-2xl">
              <h4 className="text-[11px] font-bold text-primary-600 uppercase tracking-wider mb-2">Ayuda</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Los cambios se guardan permanentemente en la base de datos de Supabase. El cronograma se recalculará automáticamente.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 bg-white shrink-0">
            <button 
              onClick={handleEditSave} 
              disabled={editModal.saving} 
              className="w-full py-4 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 active:scale-[0.98] rounded-xl shadow-lg shadow-primary-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {editModal.saving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Guardando...
                </>
              ) : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
