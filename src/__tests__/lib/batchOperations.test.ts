import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveAlerts } from '@/lib/alerts';
import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}));

describe('Phase 3: Batch Operations - saveAlerts', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnValue({ error: null }),
    maybeSingle: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createClient as any).mockResolvedValue(mockSupabase);
  });

  it('1. No hace nada si la lista de alertas está vacía', async () => {
    await saveAlerts([]);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('2. Filtra alertas duplicadas y solo hace insert de las nuevas', async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const project_id = 'proj-123';
    
    // Simular que ya existe una alerta de 'progress_deviation' para hoy
    mockSupabase.maybeSingle = vi.fn().mockResolvedValue({ 
      data: [{ type: 'progress_deviation', activity_id: null }] 
    });
    
    // (Actualización: Mi nueva lógica usa `.select('type, activity_id')` y devuelve un array de data)
    mockSupabase.from = vi.fn().mockReturnValue(mockSupabase);
    mockSupabase.select = vi.fn().mockReturnValue(mockSupabase);
    mockSupabase.eq = vi.fn().mockReturnValue(mockSupabase);
    mockSupabase.in = vi.fn().mockReturnValue(mockSupabase);
    mockSupabase.gte = vi.fn().mockResolvedValue({ 
      data: [{ type: 'progress_deviation', activity_id: null }] 
    });

    const incomingAlerts = [
      { project_id, type: 'progress_deviation', activity_id: null, message: 'Delayed', severity: 'warning', is_read: false },
      { project_id, type: 'schedule_delay', activity_id: 'act-1', message: 'Task-1 Late', severity: 'critical', is_read: false }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any[];

    await saveAlerts(incomingAlerts);

    // Debe haber consultado a la DB una vez (SELECT batch)
    expect(mockSupabase.select).toHaveBeenCalledWith('type, activity_id');
    
    // Debe haber insertado solo la segunda alerta (newAlerts)
    expect(mockSupabase.insert).toHaveBeenCalledWith([incomingAlerts[1]]);
    expect(mockSupabase.insert).not.toHaveBeenCalledWith(incomingAlerts); // No insertó ambas
  });
});
