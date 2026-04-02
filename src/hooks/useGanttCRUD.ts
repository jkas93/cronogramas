import { useCallback, useState } from 'react';
import { useSupabase } from './useSupabase';
import type { GanttDbType } from '@/lib/gantt/types';
import { toDbEndDate } from '@/lib/gantt/date-utils';

interface CrudResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

export function useGanttCRUD() {
  const supabase = useSupabase();
  const [isProcessing, setIsProcessing] = useState(false);

  // Funciones refactorizadas y purificadas (ya no tocan el estado del UI)
  const createTask = useCallback(async (
    type: GanttDbType,
    projectId: string,
    parentId: string | null,
    ganttTask: Record<string, unknown>,
    sortOrder: number
  ): Promise<CrudResult> => {
    setIsProcessing(true);
    try {
      let table = '';
      const insertData: Record<string, string | number | null> = {
        name: String(ganttTask.text),
        sort_order: sortOrder,
      };

      if (type === 'partida') {
        table = 'partidas';
        insertData.project_id = projectId;
      } else if (type === 'item') {
        table = 'items';
        insertData.partida_id = parentId?.replace('p_', '') || null;
      } else if (type === 'activity') {
        table = 'activities';
        insertData.item_id = parentId?.replace('i_', '') || null;
        insertData.start_date = ganttTask.start_date ? new Date(String(ganttTask.start_date)).toISOString().split('T')[0] : null;
        insertData.end_date = ganttTask.end_date ? toDbEndDate(String(ganttTask.end_date)) : null;
        insertData.weight = 1;
      }

      const { data, error } = await supabase.from(table).insert(insertData).select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (err: unknown) {
      console.error(`Error creating ${type}:`, err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { success: false, error: err instanceof Error ? err.message : (err as any)?.message || String(err) };
    } finally {
      setIsProcessing(false);
    }
  }, [supabase]);

  const updateTask = useCallback(async (
    type: GanttDbType,
    dbId: string,
    updates: Record<string, unknown>
  ): Promise<CrudResult> => {
    setIsProcessing(true);
    try {
      const table = type === 'partida' ? 'partidas' : type === 'item' ? 'items' : 'activities';
      const { error } = await supabase.from(table).update(updates).eq('id', dbId);
      if (error) throw error;
      return { success: true };
    } catch (err: unknown) {
      console.error(`Error updating ${type}:`, err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { success: false, error: err instanceof Error ? err.message : (err as any)?.message || String(err) };
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
    } catch (err: unknown) {
      console.error(`Error deleting ${type}:`, err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { success: false, error: err instanceof Error ? err.message : (err as any)?.message || String(err) };
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
      
      const updates = siblingDbIds.map((id, index) => ({ id, sort_order: index }));

      const { error } = await supabase.rpc('batch_update_sort_orders', {
        p_table_name: table,
        p_updates: updates
      });

      if (error) throw error;

      return { success: true };
    } catch (err: unknown) {
      console.error(`Error reordering ${type}s:`, err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { success: false, error: err instanceof Error ? err.message : (err as any)?.message || String(err) };
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
