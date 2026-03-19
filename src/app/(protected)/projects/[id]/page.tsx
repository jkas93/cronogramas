import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ProjectTabs } from '@/components/project/ProjectTabs';
import { DeleteProjectButton } from '@/components/project/DeleteProjectButton';
import { ShareModal } from '@/components/project/ShareModal';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch project with all nested data
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !project) {
    notFound();
  }

  // Fetch partidas with items and activities
  const { data: partidas } = await supabase
    .from('partidas')
    .select(`
      *,
      items (
        *,
        activities (*)
      )
    `)
    .eq('project_id', id)
    .order('sort_order');

  // Fetch all daily progress for this project's activities
  const activityIds = (partidas || [])
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

  // Fetch alerts
  const { data: alerts } = await supabase
    .from('alerts')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="p-4 md:p-8 max-w-full mx-auto fade-in">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-surface-200/50 mb-2">
            <Link href="/dashboard" className="hover:text-accent-400 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-surface-200/80 truncate max-w-[150px] md:max-w-xs">{project.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-surface-100">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-surface-200/60 mt-1">{project.description}</p>
          )}
        </div>

        {/* Share link / Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[11px] md:text-xs text-surface-200/40 bg-surface-900/30 px-3 py-1.5 rounded-md border border-surface-700/30 flex-shrink-0">
            <span className="font-medium">Período:</span>{' '}
            {format(parseISO(project.start_date), 'dd MMM yyyy', { locale: es })} <span className="text-accent-400/70">→</span> {format(parseISO(project.end_date), 'dd MMM yyyy', { locale: es })}
          </div>
          
          <DeleteProjectButton projectId={project.id} projectName={project.name} />
          
          <ShareModal 
            projectId={project.id} 
            initialToken={project.share_token} 
            projectName={project.name} 
          />
        </div>
      </div>

      {/* Tabbed Content */}
      <ProjectTabs
        project={project}
        partidas={partidas || []}
        dailyProgress={dailyProgress}
        alerts={alerts || []}
      />
    </div>
  );
}
