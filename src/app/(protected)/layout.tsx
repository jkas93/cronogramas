import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/Sidebar';

export const dynamic = 'force-dynamic';

/**
 * Protected layout — wraps all authenticated routes.
 * Golden Tower Construction brand sidebar with navy + gold theme.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single();

  return (
    <div className="h-screen flex overflow-hidden pb-16 md:pb-0">
      {/* Sidebar Modular Contráible */}
      <Sidebar user={user} profile={profile} />

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-primary-800/95 backdrop-blur-md border-t border-accent-400/10 z-[100] flex items-center justify-around px-4 py-2 safe-area-bottom shadow-[0_-4px_20px_rgba(0,11,28,0.5)]">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-accent-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
          <span className="text-[10px] font-medium tracking-wide">Inicio</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-1 text-slate-400 hover:text-accent-400 transition-colors">
          <div className="w-6 h-6 rounded-full bg-accent-400/20 flex items-center justify-center text-[11px] font-bold text-accent-400">
             {(profile?.full_name || user.email || 'U').charAt(0).toUpperCase()}
          </div>
          <span className="text-[10px] font-medium tracking-wide">Perfil</span>
        </Link>
        <form action="/auth/signout" method="POST" className="flex">
          <button type="submit" className="flex flex-col items-center gap-1 text-slate-400 hover:text-danger-400 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            <span className="text-[10px] font-medium tracking-wide">Salir</span>
          </button>
        </form>
      </nav>
    </div>
  );
}
