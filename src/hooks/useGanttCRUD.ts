import { useCallback, useState } from 'react';
import { useSupabase } from './useSupabase';
import type { GanttDbType } from '@/lib/gantt/types';
import { toDbEndDate } from '@/lib/gantt/date-utils';

interface CrudResult {
  success: boolean;
  error?: string;
  data?: any;
}

export function useGanttCRUD() {
  const supabase = useSupabase();
  const [isProcessing, setIsProcessing] = useState(false);

  // Funciones refactorizadas y purificadas (ya no tocan el estado del UI)
  const createTask = useCallback(async (
    type: GanttDbType,
    projectId: string,
    parentId: string | null,
    ganttTask: any,
    sortOrder: number
  ): Promise<CrudResult> => {
    setIsProcessing(true);
    try {
      let table = '';
      let insertData: any = {
        name: ganttTask.text,
        sort_order: sortOrder,
      };

      if (type === 'partida') {
        table = 'partidas';
        insertData.project_id = projectId;
      } else if (type === 'item') {
        table = 'items';
        // el parentId viene del gantt como 'p_uuid', por lo que extraemos la uuid
        insertData.partida_id = parentId?.replace('p_', '');
      } else if (type === 'activity') {
        table = 'activities';
        insertData.item_id = parentId?.replace('i_', '');
        insertData.start_date = ganttTask.start_date ? new Date(ganttTask.start_date).toISOString().split('T')[0] : null;
        insertData.end_date = ganttTask.end_date ? toDbEndDate(ganttTask.end_date) : null;
        insertData.weight = 1; // default fallback
      }

      const { data, error } = await supabase.from(table).insert(insertData).select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error(`Error creating ${type}:`, err);
      return { success: false, error: err.message };
    } finally {
      setIsProcessing(false);
    }
  }, [supabase]);

  const updateTask = useCallback(async (
    type: GanttDbType,
    dbId: string,
    updates: Record<string, any>
  ): Promise<CrudResult> => {
    setIsProcessing(true);
    try {
      const table = type === 'partida' ? 'partidas' : type === 'item' ? 'items' : 'activities';
      const { error } = await supabase.from(table).update(updates).eq('id', dbId);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error(`Error updating ${type}:`, err);
      return { success: false, error: err.message };
    } finally {
      setIsProcessing(false);
    }
  }, [supabase]);

  const deleteTask = useCallback(async (
    type: GanttDbType,
    dbId: string
  ): Promise<CrudResult> => {
    setIsProcessing(true);
    try {
      const table = type === 'partida' ? 'partidas' : type === 'item' ? 'items' : 'activities';
      const { error } = await supabase.from(table).delete().eq('id', dbId);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error(`Error deleting ${type}:`, err);
      return { success: false, error: err.message };
    } finally {
      setIsProcessing(false);
    }
  }, [supabase]);

  const reorderSiblings = useCallback(async (
    type: GanttDbType,
    siblingDbIds: string[]
  ): Promise<CrudResult> => {
    setIsProcessing(true);
    try {
      const table = type === 'partida' ? 'partidas' : type === 'item' ? 'items' : 'activities';
      
      // Batch updates usando Promise.all por el momento. (Fase O reemplazará por RPC SQL)
      await Promise.all(siblingDbIds.map((id, index) => {
        return supabase.from(table).update({ sort_order: index }).eq('id', id);
      }));

      return { success: true };
    } catch (err: any) {
      console.error(`Error reordering ${type}s:`, err);
      return { success: false, error: err.message };
    } finally {
      setIsProcessing(false);
    }
  }, [supabase]);

  return {
    isProcessing,
    createTask,
    updateTask,
    deleteTask,
    reorderSiblings
  };
}
