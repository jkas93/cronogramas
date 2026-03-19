import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { NewProjectButton } from '@/components/dashboard/NewProjectButton';
import { ProjectCard } from '@/components/dashboard/ProjectCard';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch projects where user is owner or member
  const { data: ownedProjects } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', user!.id)
    .order('created_at', { ascending: false });

  const { data: memberProjects } = await supabase
    .from('project_members')
    .select('project_id, role, projects(*)')
    .eq('user_id', user!.id);

  // Deduplicate: filter out member projects where the user is already the owner
  const ownedIds = new Set((ownedProjects || []).map((p) => p.id));
  const filteredMemberProjects = (memberProjects || []).filter(
    (m: any) => !ownedIds.has(m.project_id)
  );

  const allProjects = [
    ...(ownedProjects || []).map((p) => ({ ...p, userRole: 'owner' as const })),
    ...filteredMemberProjects.map((m: any) => ({
      ...(Array.isArray(m.projects) ? m.projects[0] : m.projects || {}),
      userRole: m.role,
    })).filter((p) => p.id), // Filter out missing/null projects
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-surface-100">Mis Proyectos</h1>
          <p className="text-sm text-surface-200/60 mt-1">
            {allProjects.length} proyecto{allProjects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <NewProjectButton />
      </div>

      {/* Projects Grid */}
      {allProjects.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-accent-400/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-surface-100 mb-2">
            Sin proyectos aún
          </h3>
          <p className="text-sm text-surface-200/60 mb-6">
            Crea tu primer proyecto para comenzar a planificar
          </p>
          <NewProjectButton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
