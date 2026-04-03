import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { calculateSCurve } from '@/lib/scurve';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  project: any;
}

export async function ProjectCard({ project }: Props) {
  const supabase = await createClient();

  // 1. Fetch unread alerts
  const { count: unreadAlerts } = await supabase
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', project.id)
    .eq('is_read', false);

  // 2. Fetch all activities for SCurve
  const { data: partidas } = await supabase
    .from('partidas')
    .select(`
      items (
        activities (*)
      )
    `)
    .eq('project_id', project.id);

  const activities = (partidas || [])
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    .flatMap((p: any) => p.items || [])
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    .flatMap((i: any) => i.activities || []);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activityIds = activities.map((a: any) => a.id);

  // 3. Fetch daily progress
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dailyProgress: any[] = [];
  if (activityIds.length > 0) {
    const { data } = await supabase
      .from('daily_progress')
      .select('*')
      .in('activity_id', activityIds)
      .order('date');
    dailyProgress = data || [];
  }

  // Calculate Metrics
  const scurveData = calculateSCurve(
    project.start_date,
    project.end_date,
    activities,
    dailyProgress
  );

  const formatOptions = { locale: es };
  const startDate = format(parseISO(project.start_date), 'dd MMM yyyy', formatOptions);
  const endDate = format(parseISO(project.end_date), 'dd MMM yyyy', formatOptions);
  
  // Format SPI color
  const spi = scurveData.spiIndex;
  const spiColor = spi >= 1 ? 'text-success-400' : spi >= 0.9 ? 'text-warning-400' : 'text-danger-400';
  const spiBg = spi >= 1 ? 'bg-success-500/10' : spi >= 0.9 ? 'bg-warning-500/10' : 'bg-danger-500/10';

  return (
    <Link
      href={`/projects/${project.id}`}
      className="glass-card p-6 block group relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-accent-500/10"
    >
      {/* Decorative top border based on SPI */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${spi >= 1 ? 'bg-success-500' : spi >= 0.9 ? 'bg-warning-500' : 'bg-danger-500'}`} />

      {/* Header: Role and Alerts */}
      <div className="flex items-center justify-between mb-4">
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
          project.userRole === 'owner'
            ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20'
            : project.userRole === 'admin'
            ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
            : 'bg-surface-200/10 text-surface-200/60 border border-surface-200/10'
        }`}>
          {project.userRole === 'owner' ? 'Propietario' : project.userRole === 'admin' ? 'Admin' : 'Visor'}
        </span>
        
        <div className="flex items-center gap-3">
          {(unreadAlerts ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-danger-400 bg-danger-500/10 px-2 py-1 rounded-md border border-danger-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-danger-500 animate-pulse" />
              {unreadAlerts} alertas
            </span>
          )}
          <svg className="w-5 h-5 text-surface-200/30 group-hover:text-accent-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
          </svg>
        </div>
      </div>

      {/* Project info */}
      <h3 className="text-lg font-semibold text-surface-100 mb-2 group-hover:text-accent-400 transition-colors">
        {project.name}
      </h3>
      {project.description && (
         <p className="text-sm text-surface-200/60 mb-5 line-clamp-2">
           {project.description}
         </p>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 mb-5 pb-5 border-b border-surface-700/50">
         <div>
            <div className="text-[10px] uppercase tracking-wider text-surface-200/50 font-semibold mb-1">Avance Real</div>
            <div className="text-xl font-bold text-surface-100">
              {scurveData.currentActual.toFixed(1)}%
            </div>
         </div>
         <div>
            <div className="text-[10px] uppercase tracking-wider text-surface-200/50 font-semibold mb-1">SPI (Rendimiento)</div>
            <div className={`text-xl font-bold flex items-center gap-1.5 ${spiColor}`}>
              <div className={`px-2 py-0.5 rounded-md text-sm border border-current ${spiBg}`}>
                {scurveData.spiIndex.toFixed(2)}
              </div>
            </div>
         </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-[11px] mb-1.5">
          <span className="text-surface-200/60">Plan: {scurveData.currentPlanned.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-surface-800 rounded-full h-1.5 overflow-hidden flex relative">
          {/* Planned marker (a small dot on the track) */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-surface-400 z-10" 
            style={{ left: `${Math.min(scurveData.currentPlanned, 100)}%` }} 
          />
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${
              spi >= 1 ? 'bg-success-500' : 'bg-warning-500'
            }`}
            style={{ width: `${Math.min(scurveData.currentActual, 100)}%` }}
          />
        </div>
      </div>

      {/* Dates */}
      <div className="flex items-center gap-3 text-[11px] text-surface-200/50 font-medium">
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          {startDate}
        </span>
        <span className="text-surface-200/30">→</span>
        <span>{endDate}</span>
      </div>
    </Link>
  );
}
