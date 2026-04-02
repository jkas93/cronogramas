import { describe, it, expect } from 'vitest';
import { buildProgressMap, calculateActivityProgress, buildTasksFromPartidas } from '@/lib/gantt/progress-utils';
import type { DailyProgress } from '@/lib/types';
import { samplePartidas, sampleDailyProgress } from '../../fixtures/sampleData';

describe('Progress Utils', () => {
  it('1. buildProgressMap agrupa por activity_id', () => {
    const map = buildProgressMap(sampleDailyProgress);
    // sampleDailyProgress tiene 3 de act-1 y 1 de act-2
    expect(map.get('act-1')?.length).toBe(3);
    expect(map.get('act-2')?.length).toBe(1);
    expect(map.get('act-no-existe')).toBeUndefined();
  });

  it('2. buildProgressMap maneja arrays vacíos/nulos', () => {
    expect(buildProgressMap([]).size).toBe(0);
    expect(buildProgressMap(null as unknown as DailyProgress[]).size).toBe(0);
  });

  it('3. calculateActivityProgress suma y clampa a 1.0 (100%)', () => {
    const dps = sampleDailyProgress.filter(dp => dp.activity_id === 'act-1'); 
    // 25 + 25 + 50 = 100
    expect(calculateActivityProgress(dps)).toBe(1.0);
  });

  it('4. calculateActivityProgress maneja >100% clamping', () => {
    const overProgress = [
      { id: '1', activity_id: 'a1', progress_percent: 60, date: '2026-01-01', notes: '', created_at: '', created_by: null },
      { id: '2', activity_id: 'a1', progress_percent: 60, date: '2026-01-01', notes: '', created_at: '', created_by: null }
    ];
    expect(calculateActivityProgress(overProgress)).toBe(1.0);
  });

  it('5. buildTasksFromPartidas regenera estructura plana (flat array) para Gantt', () => {
    const progressMap = buildProgressMap(sampleDailyProgress);
    const tasks = buildTasksFromPartidas(samplePartidas, progressMap);
    
    // 1 partida + 1 item + 2 actividades = 4 tasks
    expect(tasks).toHaveLength(4);
    
    // Partida
    const p1 = tasks.find(t => t.id === 'p_partida-1');
    expect(p1).toBeDefined();
    expect(p1?.db_type).toBe('partida');
    expect(p1?.parent).toBeUndefined();

    // Item
    const i1 = tasks.find(t => t.id === 'i_item-1');
    expect(i1).toBeDefined();
    expect(i1?.db_type).toBe('item');
    expect(i1?.parent).toBe('p_partida-1');

    // Actividad 1
    const a1 = tasks.find(t => t.id === 'a_act-1');
    expect(a1).toBeDefined();
    expect(a1?.db_type).toBe('activity');
    expect(a1?.parent).toBe('i_item-1');
    expect(a1?.progress).toBe(1.0); // 100% de la metadata base
    expect(a1?.end_date).toBe('2026-03-06'); // El toGanttEndDate le suma un día: 2026-03-05 -> 2026-03-06

    // Actividad 2
    const a2 = tasks.find(t => t.id === 'a_act-2');
    expect(a2?.progress).toBe(0.1); // 10%
  });
});
