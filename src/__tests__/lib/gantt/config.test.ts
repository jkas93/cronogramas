import { describe, it, expect } from 'vitest';
import { GANTT_LOCALE_ES, GANTT_ZOOM_CONFIG, GANTT_COLUMNS, getTaskClass } from '@/lib/gantt/config';

describe('Gantt Config', () => {
  it('1. Locale config contiene estructura de meses y días', () => {
    expect(GANTT_LOCALE_ES.date.month_full).toHaveLength(12);
    expect(GANTT_LOCALE_ES.date.day_short).toHaveLength(7);
  });

  it('2. Zoom config tiene tres niveles de profundidad', () => {
    expect(GANTT_ZOOM_CONFIG.levels).toHaveLength(3);
    const levels = GANTT_ZOOM_CONFIG.levels.map(l => l.name);
    expect(levels).toContain('day');
    expect(levels).toContain('week');
    expect(levels).toContain('month');
  });

  it('3. Las columnas modo readonly omiten los botones de acción', () => {
    const columns = GANTT_COLUMNS(true);
    // Extraemos el string HTML usando un mock basico
    const htmlText = columns[0].template({ text: 'Test', db_type: 'partida' });
    expect(htmlText).not.toContain('data-action="add"');
    expect(htmlText).not.toContain('data-action="edit"');
    expect(htmlText).not.toContain('data-action="delete"');
  });

  it('4. Las columnas modo normal incluyen los botones de acción', () => {
    const columns = GANTT_COLUMNS(false);
    const htmlText = columns[0].template({ text: 'Test', db_type: 'partida' });
    expect(htmlText).toContain('data-action="add"');
    expect(htmlText).toContain('data-action="edit"');
    expect(htmlText).toContain('data-action="delete"');
  });

  it('5. getTaskClass asigna la CSS class correcta según db_type', () => {
    expect(getTaskClass(new Date(), new Date(), { db_type: 'partida' })).toBe('is-partida-bar');
    expect(getTaskClass(new Date(), new Date(), { db_type: 'item' })).toBe('is-item-bar');
    expect(getTaskClass(new Date(), new Date(), { db_type: 'activity', progress: 1 })).toBe('completed-task');
    expect(getTaskClass(new Date(), new Date(), { db_type: 'activity', progress: 0.5 })).toBe('in-progress-task');
  });
});
