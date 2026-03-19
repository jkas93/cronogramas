import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-2xl fade-in">
        {/* Logo / Brand */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-400 mb-6 shadow-lg shadow-primary-500/20">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-5xl font-extrabold gradient-text mb-4">
            Cronograma
          </h1>
          <p className="text-lg text-surface-200/70 max-w-md mx-auto">
            Control de proyectos con diagramas de Gantt, Curva S (EVM), y
            sistema de alertas inteligentes.
          </p>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {['Gantt Interactivo', 'Curva S (EVM)', 'Alertas', 'Vista Cliente'].map((feature) => (
            <span
              key={feature}
              className="px-4 py-1.5 text-xs font-medium rounded-full bg-primary-500/10 text-primary-300 border border-primary-500/20"
            >
              {feature}
            </span>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login" className="btn-primary text-center min-w-[180px]">
            Iniciar Sesión
          </Link>
          <Link href="/register" className="btn-secondary text-center min-w-[180px]">
            Crear Cuenta
          </Link>
        </div>

        {/* Footer note */}
        <p className="mt-12 text-xs text-surface-200/40">
          Desarrollado con Next.js · Supabase · TailwindCSS
        </p>
      </div>
    </main>
  );
}
