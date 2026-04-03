'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PartidaWithItems, DailyProgress } from '@/lib/types';
import { GanttDbType } from '@/lib/gantt/types';
import { buildProgressMap, buildTasksFromPartidas } from '@/lib/gantt/progress-utils';
import { useGanttCRUD } from '@/hooks/useGanttCRUD';

import { GanttChart } from './GanttChart';
import { GanttSidebar } from './GanttSidebar';
import { ImportExcelButton } from './ImportExcelButton';
import { MilestoneModal } from './MilestoneModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';

interface Props {
  projectId: string;
  partidas: PartidaWithItems[];
  dailyProgress?: DailyProgress[];
  readonly?: boolean;
}

export function GanttView({ projectId, partidas, dailyProgress = [], readonly = false }: Props) {
  const router = useRouter();
  const supabase = createClient();
  
  const [zoomLevel, setZoomLevel] = useState('day');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ganttRef = useRef<any>(null);
  
  const { updateTask } = useGanttCRUD();

  const [editModal, setEditModal] = useState({
    open: false,
    taskId: '',
    dbId: '',
    dbType: null as GanttDbType | null,
    name: '',
    startDate: '',
    endDate: '',
    weight: '1',
    progress: 0,
  });

  useEffect(() => {
    async function checkOwner() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: proj } = await supabase.from('projects').select('owner_id').eq('id', projectId).single();
      setIsOwner(user?.id === proj?.owner_id);
    }
    checkOwner();
  }, [projectId, supabase]);

  const tasksData = useMemo(() => {
    const progressMap = buildProgressMap(dailyProgress);
    return buildTasksFromPartidas(partidas, progressMap);
  }, [partidas, dailyProgress]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEditTaskClick = (details: any) => {
    setEditModal({ ...details, open: true });
  };

  const handleSidebarSave = async (taskId: string, dbType: GanttDbType, dbId: string, updates: Record<string, unknown>) => {
    const res = await updateTask(dbType, dbId, updates);
    if (res.success) {
      if (ganttRef.current) {
        const task = ganttRef.current.getTask(taskId);
        if (task) {
          if (updates.name) task.text = updates.name;
          if (updates.start_date) task.start_date = new Date(updates.start_date as string);
          if (updates.end_date) {
             const e = new Date(updates.end_date as string);
             e.setDate(e.getDate() + 1); // Transform to DHTMLX exclusive end date
             task.end_date = e;
          }
          if (updates.weight) task.weight = updates.weight;
          ganttRef.current.updateTask(taskId);
        }
      }
      setEditModal(p => ({ ...p, open: false }));
      router.refresh();
    }
  };

  return (
    <>
      <div className={isFullscreen ? "fixed inset-0 z-[100] bg-surface-50 p-2 md:p-4 flex flex-col h-screen w-screen" : "flex flex-col h-full"}>
        {/* Top Controls Bar */}
        <div className="flex flex-row items-center gap-3 mb-4 shrink-0 overflow-x-auto scrollbar-hide py-1">
          <div className="flex items-center gap-2 flex-nowrap shrink-0">
            <div className="flex bg-surface-800 rounded-lg p-1 border border-surface-700/50 flex-shrink-0 shadow-sm">
              <button onClick={() => setZoomLevel('day')} className={`px-3 py-1 text-[10px] md:text-xs rounded-md font-semibold transition-all ${zoomLevel === 'day' ? 'bg-primary-600 text-white' : 'text-surface-300'}`}>
                <span className="hidden sm:inline">Días</span>
                <span className="sm:hidden">D</span>
              </button>
              <button onClick={() => setZoomLevel('week')} className={`px-3 py-1 text-[10px] md:text-xs rounded-md font-semibold transition-all ${zoomLevel === 'week' ? 'bg-primary-600 text-white' : 'text-surface-300'}`}>
                <span className="hidden sm:inline">Semanas</span>
                <span className="sm:hidden">S</span>
              </button>
              <button onClick={() => setZoomLevel('month')} className={`px-3 py-1 text-[10px] md:text-xs rounded-md font-semibold transition-all ${zoomLevel === 'month' ? 'bg-primary-600 text-white' : 'text-surface-300'}`}>
                <span className="hidden sm:inline">Meses</span>
                <span className="sm:hidden">M</span>
              </button>
            </div>

            <div className="w-px h-6 bg-surface-700/50 mx-1 flex-shrink-0"></div>

            {!readonly && (
              <button onClick={() => router.refresh()} className="p-2 border border-primary-500/20 text-primary-400 bg-primary-500/5 rounded-lg shadow-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
            
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

        {/* Workspace */}
        <div className={`relative z-10 glass-card overflow-hidden gantt-dark-theme-wrapper border-b-0 rounded-b-none ${isFullscreen ? 'flex-1' : 'h-[600px] min-h-[500px]'}`}>
          <ErrorBoundary>
            <GanttChart
              projectId={projectId}
              tasksData={tasksData}
              readonly={readonly}
              zoomLevel={zoomLevel}
              onEditTask={handleEditTaskClick}
              ganttRef={ganttRef}
            />
          </ErrorBoundary>
        </div>

        {/* Footer Metrics */}
        <div className="bg-surface-800 border gap-4 border-surface-700/50 p-2 flex justify-end items-center rounded-b-xl text-[10px] font-bold text-surface-200/50 uppercase tracking-widest">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-surface-600"></div><span>En Progreso</span></div>
          <div className="flex items-center gap-1.5 mr-4"><div className="w-2.5 h-2.5 rounded-full bg-accent-500"></div><span className="text-accent-400">Completado</span></div>
        </div>
      </div>

      <GanttSidebar
        open={editModal.open}
        onClose={() => setEditModal(p => ({ ...p, open: false }))}
        taskId={editModal.taskId}
        dbId={editModal.dbId}
        dbType={editModal.dbType}
        name={editModal.name}
        startDate={editModal.startDate}
        endDate={editModal.endDate}
        weight={editModal.weight}
        progress={editModal.progress}
        onSave={handleSidebarSave}
        readonly={readonly}
      />
    </>
  );
}
