import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { NewProjectButton } from '@/components/dashboard/NewProjectButton';

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
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="glass-card p-6 block group"
            >
              {/* Role badge */}
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
                <svg className="w-5 h-5 text-surface-200/30 group-hover:text-accent-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                </svg>
              </div>

              {/* Project info */}
              <h3 className="text-lg font-semibold text-surface-100 mb-2 group-hover:text-accent-400 transition-colors">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-sm text-surface-200/60 mb-4 line-clamp-2">
                  {project.description}
                </p>
              )}

              {/* Dates */}
              <div className="flex items-center gap-4 text-xs text-surface-200/50">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  {project.start_date}
                </span>
                <span className="text-surface-200/30">→</span>
                <span>{project.end_date}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
