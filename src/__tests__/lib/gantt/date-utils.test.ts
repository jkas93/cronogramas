import { describe, it, expect } from 'vitest';
import { toGanttEndDate, toDbEndDate, formatTaskDate } from '@/lib/gantt/date-utils';

describe('Date Utils', () => {
  it('1. toGanttEndDate suma un día a fecha ISO string', () => {
    expect(toGanttEndDate('2026-03-15')).toBe('2026-03-16');
  });

  it('2. toDbEndDate resta un día a fecha ISO string', () => {
    expect(toDbEndDate('2026-03-16')).toBe('2026-03-15');
  });

  it('3. toGanttEndDate con objeto Date', () => {
    expect(toGanttEndDate(new Date('2026-03-15T12:00:00'))).toBe('2026-03-16');
  });

  it('4. toDbEndDate con objeto Date', () => {
    expect(toDbEndDate(new Date('2026-03-16T12:00:00'))).toBe('2026-03-15');
  });

  it('5. Edge case: bisiesto cruce de mes', () => {
    expect(toGanttEndDate('2024-02-29')).toBe('2024-03-01');
    expect(toDbEndDate('2024-03-01')).toBe('2024-02-29');
  });

  it('6. formatTaskDate estandariza salida', () => {
    expect(formatTaskDate(new Date('2026-03-01T12:00:00'))).toBe('2026-03-01');
    expect(formatTaskDate('2026-03-01')).toBe('2026-03-01');
  });

  it('7. Manejo seguro de fechas inválidas o nulas', () => {
    expect(toGanttEndDate('')).toBe('');
    expect(toDbEndDate('')).toBe('');
    expect(formatTaskDate(null)).toBe('');
  });
});
