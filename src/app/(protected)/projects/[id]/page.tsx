import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ProjectTabs } from '@/components/project/ProjectTabs';
import { DeleteProjectButton } from '@/components/project/DeleteProjectButton';

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
    <div className="p-8 max-w-full mx-auto fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-surface-200/50 mb-2">
            <Link href="/dashboard" className="hover:text-accent-400 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-surface-200/80">{project.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-surface-100">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-surface-200/60 mt-1">{project.description}</p>
          )}
        </div>

        {/* Share link */}
        <div className="flex items-center gap-3">
          <div className="text-xs text-surface-200/40">
            <span className="font-medium">Período:</span>{' '}
            {project.start_date} → {project.end_date}
          </div>
          <DeleteProjectButton projectId={project.id} projectName={project.name} />
          <Link
            href={`/share/${project.share_token}`}
            target="_blank"
            className="btn-secondary text-xs flex items-center gap-2"
            title="Abrir vista pública del proyecto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            Compartir
          </Link>
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
