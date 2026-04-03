import type { Project, Activity, DailyProgress } from '@/lib/types';

export const sampleProject: Project = {
  id: 'proj-123',
  name: 'Proyecto de Prueba',
  description: 'Un proyecto para tests',
  start_date: '2026-03-01',
  end_date: '2026-03-31',
  owner_id: 'user-123',
  share_token: 'token123',
  created_at: '2026-02-28T00:00:00Z',
  updated_at: '2026-02-28T00:00:00Z'
};

export const sampleActivities: Activity[] = [
  { id: 'act-1', item_id: 'item-1', name: 'Actividad 1', start_date: '2026-03-01', end_date: '2026-03-05', weight: 40, sort_order: 0, created_at: '', updated_at: '' },
  { id: 'act-2', item_id: 'item-1', name: 'Actividad 2', start_date: '2026-03-06', end_date: '2026-03-10', weight: 60, sort_order: 1, created_at: '', updated_at: '' },
];

export const sampleDailyProgress: DailyProgress[] = [
  { id: 'dp-1', activity_id: 'act-1', date: '2026-03-01', progress_percent: 25, notes: '', created_by: null, created_at: '' },
  { id: 'dp-2', activity_id: 'act-1', date: '2026-03-02', progress_percent: 25, notes: '', created_by: null, created_at: '' },
  { id: 'dp-3', activity_id: 'act-1', date: '2026-03-03', progress_percent: 50, notes: '', created_by: null, created_at: '' }, // 100% total for act-1
  { id: 'dp-4', activity_id: 'act-2', date: '2026-03-06', progress_percent: 10, notes: '', created_by: null, created_at: '', has_restriction: true, restriction_reason: 'Clima' },
];

export const samplePartidas = [
  {
    id: 'partida-1',
    project_id: 'proj-123',
    name: 'Fase Inicial',
    sort_order: 0,
    created_at: '',
    items: [
      {
        id: 'item-1',
        partida_id: 'partida-1',
        name: 'Movimiento de Tierras',
        sort_order: 0,
        created_at: '',
        activities: sampleActivities
      }
    ]
  }
];

export const sampleDailyProgressMultiDate: DailyProgress[] = [
  { id: 'dp-m1', activity_id: 'act-1', date: '2026-03-01', progress_percent: 10, notes: '', created_by: null, created_at: '' },
  { id: 'dp-m2', activity_id: 'act-1', date: '2026-03-02', progress_percent: 20, notes: '', created_by: null, created_at: '' }
];

export const sampleActivityWithPhotos = {
  id: 'act-3', item_id: 'item-1', name: 'Act. con fotos', start_date: '2026-03-01', end_date: '2026-03-05', weight: 10, sort_order: 2, created_at: '', updated_at: ''
};

export const sampleEmptyPartida = {
  id: 'partida-empty', project_id: 'proj-123', name: 'Partida Vacia', sort_order: 1, created_at: '', items: []
};
