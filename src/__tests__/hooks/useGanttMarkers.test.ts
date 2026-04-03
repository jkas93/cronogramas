import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGanttMarkers } from '@/hooks/useGanttMarkers';
import { createMockSupabase } from '../mocks/supabase';
import * as useSupabaseModule from '@/hooks/useSupabase';

vi.mock('@/hooks/useSupabase', () => ({
  useSupabase: vi.fn(),
}));

describe('useGanttMarkers', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockGanttInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSupabaseModule.useSupabase as any).mockReturnValue(mockSupabase);

    mockGanttInstance = {
      getMarkers: vi.fn().mockReturnValue([{ id: 'old_1' }]),
      deleteMarker: vi.fn(),
      addMarker: vi.fn(),
      renderMarkers: vi.fn(),
    };
  });

  it('1. syncMarkers limpia marcadores antiguos antes de inyectar', async () => {
    const { result } = renderHook(() => useGanttMarkers());

    mockSupabase._mocks.eq.mockResolvedValueOnce({ data: [], error: null });

    await act(async () => {
      await result.current.syncMarkers(mockGanttInstance, 'proj_1');
    });

    expect(mockGanttInstance.getMarkers).toHaveBeenCalled();
    expect(mockGanttInstance.deleteMarker).toHaveBeenCalledWith('old_1');
  });

  it('2. syncMarkers siempre inyecta el marcador HOY una sola vez', async () => {
    const { result } = renderHook(() => useGanttMarkers());

    mockSupabase._mocks.eq.mockResolvedValueOnce({ data: [], error: null });

    await act(async () => {
      await result.current.syncMarkers(mockGanttInstance, 'proj_1');
    });

    // Se debió llamar addMarker mínimo 1 vez para el HOY
    expect(mockGanttInstance.addMarker).toHaveBeenCalledTimes(1);
    expect(mockGanttInstance.addMarker.mock.calls[0][0].text).toBe('HOY');
  });

  it('3. syncMarkers inyecta hitos de la DB', async () => {
    const { result } = renderHook(() => useGanttMarkers());

    mockSupabase._mocks.eq.mockResolvedValueOnce({ 
      data: [{ id: 'ms1', name: 'Inicio de Obra', date: '2026-03-01' }], 
      error: null 
    });

    await act(async () => {
      await result.current.syncMarkers(mockGanttInstance, 'proj_1');
    });

    // addMarker 2 veces (1 Hoy + 1 Hito)
    expect(mockGanttInstance.addMarker).toHaveBeenCalledTimes(2);
    expect(mockGanttInstance.addMarker.mock.calls[1][0].text).toBe('Inicio de Obra');
    expect(mockGanttInstance.renderMarkers).toHaveBeenCalled();
  });

  it('4. syncMarkers no explota si addMarker falla', async () => {
    const { result } = renderHook(() => useGanttMarkers());
    
    mockGanttInstance.addMarker = vi.fn().mockImplementation(() => {
      throw new Error('_markers is undefined');
    });
    
    mockSupabase._mocks.eq.mockResolvedValueOnce({ data: [], error: null });
    
    await act(async () => {
      await result.current.syncMarkers(mockGanttInstance, 'proj_1');
    });
    
    expect(mockGanttInstance.addMarker).toHaveBeenCalled();
  });
});
