import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGanttCRUD } from '@/hooks/useGanttCRUD';
import { createMockSupabase } from '../mocks/supabase';
import * as useSupabaseModule from '@/hooks/useSupabase';

type CrudResult = { success: boolean; data?: unknown; error?: string };

// Mock del cliente Supabase
vi.mock('@/hooks/useSupabase', () => ({
  useSupabase: vi.fn(),
}));

describe('useGanttCRUD', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSupabaseModule.useSupabase as any).mockReturnValue(mockSupabase);
  });

  it('1. createTask("partida") llama a tabla partidas y retorna éxito', async () => {
    const { result } = renderHook(() => useGanttCRUD());
    
    mockSupabase._mocks.single.mockResolvedValueOnce({ data: { id: 'p123' }, error: null });

    let crudRes: CrudResult = { success: false };
    await act(async () => {
      crudRes = await result.current.createTask('partida', 'proj_1', null, { text: 'Mi Partida' }, 0);
    });

    expect(crudRes.success).toBe(true);
    expect(mockSupabase._mocks.from).toHaveBeenCalledWith('partidas');
    expect(mockSupabase._mocks.insert).toHaveBeenCalledWith({
      project_id: 'proj_1',
      name: 'Mi Partida',
      sort_order: 0
    });
  });

  it('4. updateTask retorna false si hay error de DB', async () => {
    const { result } = renderHook(() => useGanttCRUD());
    
    mockSupabase._mocks.eq.mockResolvedValueOnce({ error: { message: 'Database connection error' } });

    let crudRes: CrudResult = { success: false };
    await act(async () => {
      crudRes = await result.current.updateTask('item', 'item_2', { name: 'New Item' });
    });

    expect(crudRes.success).toBe(false);
    expect(crudRes.error).toBe('Database connection error');
  });

  it('5. deleteTask elimina de la tabla adecuada', async () => {
    const { result } = renderHook(() => useGanttCRUD());
    
    mockSupabase._mocks.eq.mockResolvedValueOnce({ error: null });

    await act(async () => {
      await result.current.deleteTask('activity', 'act_1');
    });

    expect(mockSupabase._mocks.from).toHaveBeenCalledWith('activities');
    expect(mockSupabase._mocks.delete).toHaveBeenCalled();
  });

  it('6. reorderSiblings ejecuta batch update', async () => {
    const { result } = renderHook(() => useGanttCRUD());
    
    mockSupabase._mocks.rpc.mockResolvedValueOnce({ error: null });

    await act(async () => {
      await result.current.reorderSiblings('item', ['id1', 'id2', 'id3']);
    });

    expect(mockSupabase._mocks.rpc).toHaveBeenCalledWith('batch_update_sort_orders', {
      p_table_name: 'items',
      p_updates: [
        { id: 'id1', sort_order: 0 },
        { id: 'id2', sort_order: 1 },
        { id: 'id3', sort_order: 2 }
      ]
    });
  });
});
