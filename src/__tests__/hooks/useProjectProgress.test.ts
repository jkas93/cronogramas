import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useProjectProgress } from '@/hooks/useProjectProgress';
import { samplePartidas, sampleDailyProgress } from '../fixtures/sampleData';
import { DailyProgress } from '@/lib/types';

describe('useProjectProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. initialDate es la fecha más reciente cuando hay avances', () => {
    const { result } = renderHook(() => useProjectProgress(samplePartidas, sampleDailyProgress));
    // El avance más reciente en sampleDailyProgress es '2026-03-06'
    expect(result.current.selectedDate).toBe('2026-03-06');
  });

  it('2. initialDate es hoy si no hay avances', () => {
    const { result } = renderHook(() => useProjectProgress(samplePartidas, []));
    expect(result.current.selectedDate).toBe('2026-03-10');
  });

  it('3. Muestra actividades con progreso > 0 o que tengan notas, fotos o restriccion', () => {
    const { result } = renderHook(() => useProjectProgress(samplePartidas, sampleDailyProgress));
    const data = result.current.dataForSelectedDate;
    expect(data.length).toBe(1);
    expect(data[0].items[0].activities[0].id).toBe('act-2');
  });

  it('4. Filtra actividades con progreso 0 sin extras', () => {
    const emptyProgress: DailyProgress[] = [
      { id: 'dp-empty', activity_id: 'act-1', date: '2026-03-06', progress_percent: 0, notes: '', created_by: null, created_at: '' }
    ];
    const { result } = renderHook(() => useProjectProgress(samplePartidas, emptyProgress));
    const data = result.current.dataForSelectedDate;
    expect(data.length).toBe(0);
  });

  it('5. changeDate(1) avanza un día', () => {
    const { result } = renderHook(() => useProjectProgress(samplePartidas, []));
    expect(result.current.selectedDate).toBe('2026-03-10');
    
    act(() => {
      result.current.changeDate(1);
    });
    
    expect(result.current.selectedDate).toBe('2026-03-11');
  });

  it('6. changeDate(-1) retrocede un día', () => {
    const { result } = renderHook(() => useProjectProgress(samplePartidas, []));
    
    act(() => {
      result.current.changeDate(-1);
    });
    
    expect(result.current.selectedDate).toBe('2026-03-09');
  });

  it('7. isToday detecta hoy correctamente', () => {
    const { result } = renderHook(() => useProjectProgress(samplePartidas, []));
    expect(result.current.isToday).toBe(true);
    
    act(() => {
      result.current.changeDate(-1);
    });
    
    expect(result.current.isToday).toBe(false);
  });

  it('8. Calcula stats correctamente', () => {
    const customProgress: DailyProgress[] = [
      { id: 'dp-2', activity_id: 'act-2', date: '2026-03-06', progress_percent: 10, notes: 'Hola', photo_urls: ['url1', 'url2'], has_restriction: true, created_by: null, created_at: '' }
    ];
    const { result } = renderHook(() => useProjectProgress(samplePartidas, customProgress));
    const stats = result.current.stats;
    
    expect(stats.activitiesCount).toBe(1);
    expect(stats.photosCount).toBe(2);
    expect(stats.restrictionsCount).toBe(1);
  });
});
