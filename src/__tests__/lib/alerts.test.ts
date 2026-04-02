import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { evaluateAlerts } from '@/lib/alerts';
import { sampleActivities, sampleDailyProgress } from '../fixtures/sampleData';

describe('Alerts Engine - Baseline Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. Proyecto sin retraso no genera alertas globales (o al menos no críticas)', () => {
    // act-1 finished, act-2 ongoing tracking perfectly
    const perfectProgress = [
      ...sampleDailyProgress.filter(dp => dp.activity_id === 'act-1'),
      { id: 'dp-5', activity_id: 'act-2', date: '2026-03-06', progress_percent: 25, notes: '', created_by: null, created_at: '' },
      { id: 'dp-6', activity_id: 'act-2', date: '2026-03-07', progress_percent: 25, notes: '', created_by: null, created_at: '' },
      { id: 'dp-7', activity_id: 'act-2', date: '2026-03-09', progress_percent: 25, notes: '', created_by: null, created_at: '' },
      { id: 'dp-8', activity_id: 'act-2', date: '2026-03-10', progress_percent: 25, notes: '', created_by: null, created_at: '' },
    ];
    
    const result = evaluateAlerts('proj-123', '2026-03-01', '2026-03-15', sampleActivities, perfectProgress);
    
    // Ninguna alerta global de deviation negative
    const deviationAlerts = result.newAlerts.filter(a => a.type === 'progress_deviation');
    expect(deviationAlerts).toHaveLength(0);
  });

  it('2. Actividad con fechas pasadas sin completar genera schedule_delay', () => {
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z')); // Pasamos la fecha fin de todas
    
    // act-1 incompleta (solo 25%)
    const partialProgress = [
      { id: 'dp-1', activity_id: 'act-1', date: '2026-03-01', progress_percent: 25, notes: '', created_by: null, created_at: '' }
    ];
    
    const result = evaluateAlerts('proj-123', '2026-03-01', '2026-03-15', sampleActivities, partialProgress);
    
    const scheduleAlerts = result.newAlerts.filter(a => a.type === 'schedule_delay' && a.activity_id === 'act-1');
    expect(scheduleAlerts.length).toBe(1);
    expect(scheduleAlerts[0].severity).toBe('critical'); // Retraso de > 7 días
  });

  it('5. Reporte con restricción hoy -> genera alerta crítica', () => {
    vi.setSystemTime(new Date('2026-03-06T12:00:00Z')); // Mismo día que dp-4 que tiene restricción
    const result = evaluateAlerts('proj-123', '2026-03-01', '2026-03-15', sampleActivities, sampleDailyProgress);
    
    const restrictionAlerts = result.newAlerts.filter(a => 
      a.type === 'schedule_delay' && 
      a.message.includes('Restricción reportada')
    );
    expect(restrictionAlerts.length).toBe(1); // porque corre en el día de la restricción
    expect(restrictionAlerts[0].severity).toBe('critical');
  });
});
