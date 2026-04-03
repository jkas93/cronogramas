import { describe, it, expect, vi } from 'vitest';
import { GANTT_LOCALE_ES, getGanttZoomConfig, GANTT_COLUMNS, getTaskClass } from '@/lib/gantt/config';

describe('Gantt Config', () => {
  it('1. Locale config contiene estructura de meses y días', () => {
    expect(GANTT_LOCALE_ES.date.month_full).toHaveLength(12);
    expect(GANTT_LOCALE_ES.date.day_short).toHaveLength(7);
  });

  it('2. Zoom config tiene tres niveles de profundidad', () => {
    const mockGantt = { date: { date_to_str: () => () => '01' } };
    const config = getGanttZoomConfig(mockGantt);
    expect(config.levels).toHaveLength(3);
    const levels = config.levels.map(l => l.name);
    expect(levels).toContain('day');
    expect(levels).toContain('week');
    expect(levels).toContain('month');
  });

  it('3. Las columnas modo readonly omiten los botones de acción', () => {
    const columns = GANTT_COLUMNS(true);
    // Extraemos el string HTML usando un mock basico
    const htmlText = columns[0].template({ id: '1', text: 'Test', db_type: 'partida' });
    expect(htmlText).not.toContain('data-action="add"');
    expect(htmlText).not.toContain('data-action="edit"');
    expect(htmlText).not.toContain('data-action="delete"');
  });

  it('4. Las columnas modo normal incluyen los botones de acción', () => {
    const columns = GANTT_COLUMNS(false);
    const htmlText = columns[0].template({ id: '1', text: 'Test', db_type: 'partida' });
    expect(htmlText).toContain('data-action="add"');
    expect(htmlText).toContain('data-action="edit"');
    expect(htmlText).toContain('data-action="delete"');
  });

  it('5. getTaskClass asigna la CSS class correcta según db_type', () => {
    expect(getTaskClass(new Date(), new Date(), { db_type: 'partida', progress: 0 })).toBe('is-partida-bar');
    expect(getTaskClass(new Date(), new Date(), { db_type: 'item', progress: 0 })).toBe('is-item-bar');
    expect(getTaskClass(new Date(), new Date(), { db_type: 'activity', progress: 1 })).toBe('completed-task');
    expect(getTaskClass(new Date(), new Date(), { db_type: 'activity', progress: 0.5 })).toBe('in-progress-task');
  });

  it('6. getTaskClass acepta objeto completo de tipo GanttTaskData', () => {
    const task: import('@/lib/gantt/types').GanttTaskData = {
      id: '1', text: 'test', start_date: '2026-01-01', db_type: 'activity', db_id: 'db1', progress: 1
    };
    expect(getTaskClass(new Date(), new Date(), task)).toBe('completed-task');
  });

  it('7. El formato de semanas usa gantt.date.date_to_str sin explotar', () => {
    const mockDateToStr = vi.fn().mockReturnValue((d: Date) => String(d.getDate()));
    const mockGantt = { date: { date_to_str: mockDateToStr } };
    
    const config = getGanttZoomConfig(mockGantt);
    const weekScale = config.levels[1].scales[1];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (weekScale as any).format(new Date('2026-03-15'));
    
    expect(mockDateToStr).toHaveBeenCalledWith('%W');
    expect(result).toContain('Sem');
  });

  it('8. El formato de DÍAS genera HTML con día de la semana', () => {
    const mockGantt = { date: { date_to_str: () => () => '01' } };
    const config = getGanttZoomConfig(mockGantt);
    const dayScale = config.levels[0].scales[1]; 
    
    const monday = new Date('2026-03-02T12:00:00');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (dayScale as any).format(monday);
    
    expect(result).toContain('L');
  });

  it('9. El formato de MESES usa strings estáticos (no explota)', () => {
    const mockGantt = { date: { date_to_str: () => () => '01' } };
    const config = getGanttZoomConfig(mockGantt);
    const monthScales = config.levels[2].scales;
    
    expect(monthScales[0].format).toBe('%Y');
    expect(monthScales[1].format).toBe('%M');
  });
});
