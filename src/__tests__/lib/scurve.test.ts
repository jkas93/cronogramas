import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateSCurve } from '@/lib/scurve';
import { sampleActivities, sampleDailyProgress } from '../fixtures/sampleData';

describe('S-Curve EVM Engine - Baseline Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. Proyecto vacío retorna defaults seguros', () => {
    const result = calculateSCurve('2026-03-01', '2026-03-31', [], []);
    expect(result.points).toEqual([]);
    expect(result.totalWeight).toBe(0);
    expect(result.spiIndex).toBe(1);
  });

  it('2. Una actividad sin progreso -> actual es 0, spi es 0', () => {
    const result = calculateSCurve('2026-03-01', '2026-03-05', [sampleActivities[0]], []);
    expect(result.totalWeight).toBe(40);
    expect(result.currentActual).toBe(0);
    expect(result.currentPlanned).toBeGreaterThan(0); // depende del día simulado
    expect(result.spiIndex).toBe(0);
  });

  it('3. Proyecto con datos completos calcula progreso planificado y real', () => {
    // Para simplificar, la suma de weights es 40 + 60 = 100
    // act-1 tiene 100% de progreso = 40% del total.
    // act-2 (hasta 2026-03-10) tiene 10% de progreso = 6% del total.
    // Total real esperado en la fecha más reciente = 46%
    const result = calculateSCurve('2026-03-01', '2026-03-15', sampleActivities, sampleDailyProgress);
    
    expect(result.totalWeight).toBe(100);
    expect(result.currentActual).toBe(46);
    // Verificamos latestProgressDate que es el 2026-03-06 según los fixtures
    expect(result.latestProgressDate).toBe('2026-03-06');
    
    const maxActual = Math.max(...result.points.filter(p => p.actual !== undefined).map(p => p.actual!));
    expect(maxActual).toBe(46);
  });

  it('10. Previene divisiones por cero con peso total 0', () => {
    const actCero = { ...sampleActivities[0], weight: 0 };
    const result = calculateSCurve('2026-03-01', '2026-03-05', [actCero], []);
    expect(result.totalWeight).toBe(0);
    expect(result.currentPlanned).toBe(0);
    expect(result.spiIndex).toBe(1); // spiIndex predeterminado a 1 si no hay planned
  });
});
