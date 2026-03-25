'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  user: {
    email?: string;
  };
  profile: {
    full_name?: string;
    avatar_url?: string;
  } | null;
}

export function Sidebar({ user, profile }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const userInitial = (profile?.full_name || user.email || 'U').charAt(0).toUpperCase();

  return (
    <aside 
      className={`hidden md:flex flex-col shrink-0 border-r border-accent-400/10 bg-primary-800/80 backdrop-blur-sm transition-all duration-300 relative ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 w-6 h-6 bg-accent-500 text-primary-900 rounded-full flex items-center justify-center hover:bg-accent-400 transition-colors z-50 shadow-md shadow-accent-500/20 shadow-[0_0_0_4px_theme(colors.primary.800)]"
        title={isCollapsed ? "Expandir menú" : "Contraer menú"}
      >
        <svg 
          className={`w-3 h-3 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Brand */}
      <div className={`flex items-center border-b border-accent-400/10 transition-all duration-300 overflow-hidden ${isCollapsed ? 'p-6 justify-center' : 'p-6 justify-start'}`}>
        <Link href="/dashboard" className="flex items-center gap-3 w-full" title={isCollapsed ? "Cronograma" : ""}>
          <div className="w-9 h-9 shrink-0 rounded-lg bg-gradient-to-br from-accent-500 to-accent-400 flex items-center justify-center shadow-md shadow-accent-400/20">
            <svg className="w-5 h-5 text-primary-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          {!isCollapsed && <span className="font-bold text-lg gradient-text whitespace-nowrap fade-in-fast">Cronograma</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-x-hidden space-y-1 transition-all duration-300 ${isCollapsed ? 'p-3 flex flex-col items-center' : 'p-4'}`}>
        <Link
          href="/dashboard"
          title={isCollapsed ? "Dashboard" : ""}
          className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
            pathname === '/dashboard' ? 'text-accent-400 bg-accent-400/10' : 'text-slate-300 hover:text-accent-400 hover:bg-accent-400/10'
          } ${isCollapsed ? 'p-3 justify-center' : 'px-4 py-2.5 w-full'}`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
          {!isCollapsed && <span className="whitespace-nowrap fade-in-fast">Dashboard</span>}
        </Link>
        <Link
          href="/profile"
          title={isCollapsed ? "Mi Perfil" : ""}
          className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
             pathname === '/profile' ? 'text-accent-400 bg-accent-400/10' : 'text-slate-300 hover:text-accent-400 hover:bg-accent-400/10'
          } ${isCollapsed ? 'p-3 justify-center' : 'px-4 py-2.5 w-full'}`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          {!isCollapsed && <span className="whitespace-nowrap fade-in-fast">Mi Perfil</span>}
        </Link>
      </nav>

      {/* User section */}
      <div className={`border-t border-accent-400/10 transition-all duration-300 overflow-x-hidden ${isCollapsed ? 'p-3 flex flex-col items-center' : 'p-4'}`}>
        <div className={`flex items-center mb-3 ${isCollapsed ? 'justify-center w-full' : 'gap-3 w-full'}`} title={isCollapsed ? profile?.full_name || 'Usuario' : ""}>
          <div className="w-9 h-9 shrink-0 rounded-full bg-accent-400/20 flex items-center justify-center text-sm font-bold text-accent-400">
            {userInitial}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 fade-in-fast">
              <p className="text-sm font-medium text-white truncate w-[160px]">
                {profile?.full_name || 'Usuario'}
              </p>
              <p className="text-xs text-slate-400 truncate w-[160px]">
                {user.email}
              </p>
            </div>
          )}
        </div>
        <form action="/auth/signout" method="POST" className="w-full">
          <button
            type="submit"
            title={isCollapsed ? "Cerrar Sesión" : ""}
            className={`w-full text-left rounded-lg text-sm transition-colors text-slate-400 hover:text-danger-400 hover:bg-danger-500/10 flex items-center group ${
              isCollapsed ? 'p-3 justify-center' : 'px-4 py-2 gap-3'
            }`}
          >
            <svg className="w-5 h-5 shrink-0 group-hover:text-danger-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            {!isCollapsed && <span className="whitespace-nowrap fade-in-fast">Cerrar Sesión</span>}
          </button>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .fade-in-fast {
          animation: fade-in-fast 0.2s ease-out forwards;
        }
        @keyframes fade-in-fast {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}} />
    </aside>
  );
}
