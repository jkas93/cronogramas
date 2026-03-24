'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ImportExcelButton } from './ImportExcelButton';
import { addDays, subDays, parseISO, format, isSameDay } from 'date-fns';
import { MilestoneModal } from './MilestoneModal';

interface Props {
  projectId: string;
  partidas: any[];
  dailyProgress?: any[];
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
  const [newActivityData, setNewActivityData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    weight: '1',
  });
  const [selectedPartida, setSelectedPartida] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [addingActivity, setAddingActivity] = useState(false);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  
  useEffect(() => {
    if (!containerRef.current || ganttInitialized.current) return;

    const initGantt = async () => {
      // 0. Fetch Milestones & Auth
      const { data: { user } } = await supabase.auth.getUser();
      const { data: proj } = await supabase.from('projects').select('owner_id').eq('id', projectId).single();
      setIsOwner(user?.id === proj?.owner_id);

      const { data: msData } = await supabase.from('project_milestones').select('*').eq('project_id', projectId);
      const currentMilestones = msData || [];
      setMilestones(currentMilestones);

      // 1. Import Gantt
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ganttModule = await import('dhtmlx-gantt');
      const gantt: any = ganttModule.gantt || ganttModule.default || ganttModule;
      // @ts-ignore - CSS modules don't have types but we need the styles for the visual grid
      await import('dhtmlx-gantt/codebase/dhtmlxgantt.css');

      ganttInitialized.current = true;

      // Enable plugins
      gantt.plugins({ marker: true });

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
      gantt.templates.task_class = function(start: any, end: any, task: any) {
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
          template: (task: any) => {
            const prog = Math.round((task.progress || 0) * 100);
            const dur = task.duration || 0;
            // Estilo según foto: letras celestes/azules encendidas. Parent cells are different.
            const titleColor = task.db_type === 'partida' ? 'color: #334155; font-weight: bold;' : (task.db_type === 'item' ? 'color: #475569; font-weight: 600;' : 'color: #60a5fa; font-weight: 500;');
            const weightBadge = task.weight ? `<span style="margin-left:6px;padding:1px 5px;font-size:9px;background:rgba(247,194,14,0.15);color:#F7C20E;border-radius:4px;border:1px solid rgba(247,194,14,0.2);">Peso: ${task.weight}</span>` : '';
            
            // Iconos CRUD en SVG
            const addIcon = `<svg style="width:14px;height:14px;color:#94a3b8;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>`;
            const editIcon = `<div style="background:#1e293b;border-radius:50%;padding:4px;"><svg style="width:12px;height:12px;color:#f8fafc;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg></div>`;
            const trashIcon = `<svg style="width:14px;height:14px;color:#94a3b8;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>`;
            const pulseIcon = `<svg style="width:16px;height:16px;color:#94a3b8;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>`;
            
            return `
              <div class="gantt-custom-cell" style="display:flex;align-items:center;justify-content:space-between;line-height:1.3;width:100%;height:100%;padding-right:12px;">
                <div style="display:flex;flex-direction:column;max-width:${readonly ? '100%' : '70%'};overflow:hidden;">
                  <span style="${titleColor} overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;" title="${task.text}">${task.text} ${weightBadge}</span>
                  <span style="font-size:10px;color:rgba(100,116,139,0.7);margin-top:2px;">${prog}% | ${dur}d</span>
                </div>
                ${!readonly ? `
                <div class="gantt-actions-container" style="display:flex;gap:12px;align-items:center;opacity:0;transition:opacity 0.2s;">
                   <div class="action-btn hover:text-accent-400" data-action="pulse" style="cursor:pointer;" title="Ver Avance">${pulseIcon}</div>
                   <div class="action-btn hover:text-primary-400" data-action="add" style="cursor:pointer;" title="Añadir sub-tarea">${addIcon}</div>
                   <div class="action-btn hover:text-primary-400" data-action="edit" style="cursor:pointer;" title="Editar tarea">${editIcon}</div>
                   <div class="action-btn hover:text-red-500" data-action="delete" style="cursor:pointer;" title="Eliminar">${trashIcon}</div>
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
            const taskProgressLogs = dailyProgress.filter((dp: any) => dp.activity_id === activity.id);
            const totalProgress = taskProgressLogs.reduce((sum: number, dp: any) => sum + Number(dp.progress_percent), 0);
            
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

      if (readonly) return;

      // CRUD Intercepts
      gantt.attachEvent("onTaskClick", (id: string, e: Event) => {
        const target = e.target as HTMLElement;
        const btn = target.closest('.action-btn');
        if (btn) {
          const action = btn.getAttribute('data-action');
          if (action === 'add') {
             gantt.createTask({text: "Nueva Tarea", duration: 1}, id);
             return false;
          } else if (action === 'edit' || action === 'pulse') {
             gantt.showLightbox(id);
             return false;
          } else if (action === 'delete') {
             // Let dhtmlx nativelly call confirm and trigger onBeforeTaskDelete
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
        import('dhtmlx-gantt').then((mod: any) => {
          const gantt = mod.gantt || mod.default || mod;
          gantt.clearAll();
        });
      }
    };
  }, [partidas, dailyProgress]);

  // Handle Zoom change safely
  const handleZoomChange = (level: string) => {
    setZoomLevel(level);
    import('dhtmlx-gantt').then((mod: any) => {
      const gantt = mod.gantt || mod.default || mod;
      gantt.ext.zoom.setLevel(level);
    });
  };

  return (
    <div className={isFullscreen ? "fixed inset-0 z-[100] bg-surface-50 p-2 md:p-4 flex flex-col h-screen w-screen" : "flex flex-col h-full"}>
      <div className="flex flex-row items-center gap-3 mb-6 shrink-0 overflow-x-auto scrollbar-hide py-1">
        
        <div className="flex items-center gap-2 flex-nowrap shrink-0">
          {/* Zoom Toggle */}
          <div className="flex bg-surface-900/50 rounded-lg p-0.5 border border-surface-700/50 flex-shrink-0">
            <button onClick={() => handleZoomChange('day')} className={`px-2 md:px-3 py-1 text-[10px] md:text-xs rounded-md transition-colors ${zoomLevel === 'day' ? 'bg-surface-700 text-surface-100' : 'text-surface-200/60 hover:text-surface-100'}`}>
              <span className="hidden sm:inline">Días</span>
              <span className="sm:hidden">D</span>
            </button>
            <button onClick={() => handleZoomChange('week')} className={`px-2 md:px-3 py-1 text-[10px] md:text-xs rounded-md transition-colors ${zoomLevel === 'week' ? 'bg-surface-700 text-surface-100' : 'text-surface-200/60 hover:text-surface-100'}`}>
              <span className="hidden sm:inline">Semanas</span>
              <span className="sm:hidden">S</span>
            </button>
            <button onClick={() => handleZoomChange('month')} className={`px-2 md:px-3 py-1 text-[10px] md:text-xs rounded-md transition-colors ${zoomLevel === 'month' ? 'bg-surface-700 text-surface-100' : 'text-surface-200/60 hover:text-surface-100'}`}>
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
              className="p-1.5 md:p-2 text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
                   } catch(e) {}
                 }
               }}
               className="p-1.5 md:p-2 text-surface-400 hover:text-danger-500 hover:bg-danger-500/10 rounded-lg transition-colors flex-shrink-0"
               title="Resetear todo el diagrama"
             >
               <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
               </svg>
             </button>
          )}

          {/* Pantalla Completa */}
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)} 
            className="p-1.5 md:p-2 text-surface-400 hover:text-accent-400 hover:bg-accent-500/10 rounded-lg transition-colors flex-shrink-0" 
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={isFullscreen ? "M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 15v4.5m0-4.5h4.5m-4.5 0l5.25 5.25M15 9V4.5m0 4.5h4.5M15 9l5.25-5.25M9 15v4.5m0-4.5H4.5m4.5 0l-5.25 5.25" : "M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15"} />
            </svg>
          </button>
          
          <div className="w-px h-6 bg-surface-700/50 mx-1 flex-shrink-0"></div>

          <MilestoneModal 
            projectId={projectId} 
            isOwner={isOwner || !readonly} 
            onUpdate={() => router.refresh()} 
          />

          {!readonly && <ImportExcelButton projectId={projectId} />}
        </div>
      </div>

      {/* Gantt chart container */}
      <div className={`glass-card overflow-hidden gantt-dark-theme-wrapper border-b-0 rounded-b-none ${isFullscreen ? 'flex-1' : 'h-[600px] min-h-[500px]'}`}>
        <style dangerouslySetInnerHTML={{__html: `
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
          style={{ width: '100%', height: '500px' }}
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
  );
}
