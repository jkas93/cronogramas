import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { SCurveChart } from '@/components/charts/SCurveChart';
import { GanttView } from '@/components/gantt/GanttView';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    { cookies: { getAll: () => [], setAll: () => { } } }
  );

  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('share_token', token)
    .single();

  return {
    title: project ? `${project.name} — Avance del Proyecto` : 'Proyecto no encontrado',
    description: 'Vista pública del avance del proyecto.',
  };
}

/**
 * Public share page — accessible without authentication.
 * Shows a read-only S-Curve chart for the project.
 */
export default async function SharePage({ params }: Props) {
  const { token } = await params;

  // Usa el cliente normal para permitir que las validaciones de Supabase
  // por lo menos usen tu Cookie de sesión local si estás testeando en tu PC y saltar RLS transitoriamente.
  // Nota: Para clientes externos se comportará como anónimo, así que el fix en Supabase (public_read_access_fix.sql) es MANDATORIO a largo plazo.
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => { }
      }
    }
  );

  // Fetch project by share token
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('share_token', token)
    .single();

  if (error || !project) {
    notFound();
  }

  // Fetch nested data
  const { data: partidas, error: partidasError } = await supabase
    .from('partidas')
    .select(`
      *,
      items (
        *,
        activities (*)
      )
    `)
    .eq('project_id', project.id)
    .order('sort_order');

  // Fetch daily progress
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

  // Detect RLS Block issue: If the exact same project exists but data lengths are zero and perhaps error is empty, 
  // It's a silent RLS row level security drop.
  const isRLSBlocked = !partidasError && partidas?.length === 0;

  return (
    <main className="min-h-screen p-4 md:p-6 lg:p-8 bg-surface-50">
      <div className="max-w-[1600px] w-full mx-auto fade-in">

        {isRLSBlocked && (
          <div className="bg-red-500/10 border-l-4 border-red-500 text-red-700 p-4 mb-8 rounded-r-lg">
            <h3 className="font-bold flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              Acceso a Lectura Bloqueado (Seguridad Supabase)
            </h3>
            <p className="mt-2 text-sm text-red-600/90">
              La solicitud de este enlace externo al servidor fue rechazada. Supabase bloquea por defecto la lectura de tus tareas (0 partidas recibidas) mediante sus Políticas RLS para usuarios externos sin cuenta (Anonymous). <br /><br />
              <strong>¡OBLIGATORIO PARA PRODUCCIÓN!</strong> <br />
              Para solucionarlo: En el archivo del proyecto <strong><code>public_read_access_fix.sql</code></strong>, copia todo el SQL que he programado y córrelo en la pestaña "SQL Editor" de tu plataforma Supabase. Eso deseará acceso de lectura "Reader" a cualquier invitado válido que porte un Link seguro.
            </p>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 bg-white p-6 rounded-2xl shadow-sm border border-surface-700">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary-600 to-primary-400 shadow-md shadow-primary-500/20">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-surface-100">{project.name}</h1>
            </div>
            {project.description && (
              <p className="text-sm text-surface-200/80 max-w-2xl">{project.description}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <span className="px-3 py-1 text-[11px] font-bold tracking-wide uppercase rounded-full bg-accent-400/10 text-accent-500 border border-accent-400/20">
              Vista de Cliente — Solo Lectura
            </span>
            <div className="text-xs text-surface-200/60 font-medium">
              {project.start_date} al {project.end_date}
            </div>
          </div>
        </div>

        <div className="space-y-10">
          {/* Gantt View Section */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-surface-700">
            <GanttView
              projectId={project.id}
              partidas={partidas || []}
              dailyProgress={dailyProgress}
              readonly={true}
            />
          </section>

          {/* S-Curve Chart Section */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-surface-700">
            <SCurveChart
              project={project}
              partidas={partidas || []}
              dailyProgress={dailyProgress}
            />
          </section>
        </div>

        {/* Footer */}
        <div className="text-center mt-10">
          <p className="text-xs text-surface-200/30">
            Reporte desarrollado por Kevin Avalos · Control de Proyectos
          </p>
        </div>
      </div>
    </main>
  );
}
