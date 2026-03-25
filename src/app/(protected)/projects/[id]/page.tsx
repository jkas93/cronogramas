import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ProjectTabs } from '@/components/project/ProjectTabs';
import { ProjectActionsMenu } from '@/components/project/ProjectActionsMenu';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch project, partidas, alerts and milestones in parallel
  const [projectRes, partidasRes, alertsRes, milestonesRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('partidas').select('*, items (*, activities (*))').eq('project_id', id).order('sort_order'),
    supabase.from('alerts').select('*').eq('project_id', id).order('created_at', { ascending: false }).limit(20),
    supabase.from('project_milestones').select('*').eq('project_id', id).order('date')
  ]);

  const project = projectRes.data;
  const projectError = projectRes.error;

  if (projectError || !project) {
    notFound();
  }

  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = user?.id === project.owner_id;

  const partidas = partidasRes.data || [];
  const alerts = alertsRes.data || [];
  const milestones = milestonesRes.data || [];

  // Fetch all daily progress for this project's activities (after we have activity ids)
  const activityIds = partidas
    .flatMap((p: any) => p.items || [])
    .flatMap((i: any) => i.activities || [])
    .map((a: any) => a.id);

  let dailyProgress: any[] = [];
  if (activityIds.length > 0) {
    const { data } = await supabase
      .from('daily_progress')
      .select('*')
      .in('activity_id', activityIds)
      .order('date');
    dailyProgress = data || [];
  }

  return (
    <div className="p-3 md:p-6 max-w-full mx-auto fade-in">
      {/* Header Estructurado P.U.L.S.O. */}
      <div className="flex flex-col gap-2 mb-4">

        {/* Row 1: Breadcrumbs (Minimal) */}
        <div className="flex items-center gap-2 text-[10px] md:text-sm text-surface-200/30 uppercase tracking-widest font-bold">
          <Link href="/dashboard" className="hover:text-accent-400 transition-colors">
            Dashboard
          </Link>
          <span className="opacity-50">/</span>
          <span className="text-surface-200/60 truncate max-w-[150px] md:max-w-xs">{project.name}</span>
        </div>

        {/* Row 2: Title & Primary Actions Menu (SIEMPRE AL MISMO NIVEL) */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-surface-100 leading-tight">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-xs text-surface-200/50 mt-0.5 max-w-2xl line-clamp-1">{project.description}</p>
            )}
          </div>

          <div className="flex-shrink-0 pt-0.5">
            <ProjectActionsMenu project={project} isOwner={isOwner} />
          </div>
        </div>

        {/* Row 3: Metrics & Timeframes (Secondary info) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-[10px] md:text-xs text-surface-200 bg-white border border-surface-700/50 px-3 py-1.5 rounded-lg flex-shrink-0 shadow-sm font-medium">
            <span className="font-bold mr-1 uppercase tracking-wider text-surface-400">Periodo:</span>{' '}
            {format(parseISO(project.start_date), 'dd MMM yyyy', { locale: es })} <span className="text-accent-500 font-bold mx-1">→</span> {format(parseISO(project.end_date), 'dd MMM yyyy', { locale: es })}
          </div>
        </div>
      </div>

      {/* Tabbed Content */}
      <ProjectTabs
        project={project}
        partidas={partidas || []}
        dailyProgress={dailyProgress}
        alerts={alerts || []}
        milestones={milestones || []}
      />
    </div>
  );
}
