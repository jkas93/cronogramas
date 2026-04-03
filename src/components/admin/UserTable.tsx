'use client';

import { useState } from 'react';
import { updateSystemRole, deleteUser } from '@/app/actions/admin';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserData {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  system_role: 'user' | 'superadmin';
  created_at: string;
  email: string;
  projects?: { name: string; role: string }[];
}

export function UserTable({ users, currentUserId }: { users: UserData[], currentUserId: string }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === currentUserId) return;
    
    const roleName = newRole === 'superadmin' ? 'SUPERADMIN' : 'USUARIO NORMAL';
    if (!window.confirm(`¿Estás seguro de convertir a este usuario en ${roleName}?\n\nLos superadmins tienen acceso irrestricto a toda la base de datos.`)) return;
    
    setLoadingId(userId);
    try {
      await updateSystemRole(userId, newRole as 'user' | 'superadmin');
    } catch (err) {
      alert('Error cambiando el rol: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === currentUserId) return;
    
    if (!window.confirm(`⚠️ ADVERTENCIA CRÍTICA\n\n¿Estás absolutamente seguro de que deseas eliminar permanentemente la cuenta de ${userName || 'este usuario'}?\n\nEsta acción destruirá su acceso y no se puede deshacer.`)) return;
    
    setLoadingId(userId);
    try {
      await deleteUser(userId);
    } catch (err) {
      alert('Error eliminando usuario: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      if (loadingId === userId) setLoadingId(null);
    }
  };

  return (
    <div className="glass-card overflow-hidden fade-in shadow-xl">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-surface-800/50 border-b border-surface-700/50 text-xs uppercase text-surface-200/50 font-bold tracking-widest">
            <tr>
              <th className="px-6 py-4">Usuario</th>
              <th className="px-6 py-4">Rol del Sistema</th>
              <th className="px-6 py-4 min-w-[200px]">Proyectos del Equipo</th>
              <th className="px-6 py-4">Fecha de Registro</th>
              <th className="px-6 py-4 text-center">Gestión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700/30">
            {users.map((user) => {
              const isCurrentUser = user.id === currentUserId;
              const dateObj = parseISO(user.created_at);
              
              return (
                <tr key={user.id} className="hover:bg-surface-800/20 transition-colors">
                   <td className="px-6 py-4">
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-500 font-bold shrink-0 shadow-inner">
                         {user.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                           <img src={user.avatar_url} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                         ) : (
                           user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'
                         )}
                       </div>
                       <div>
                         <p className="font-semibold text-surface-100 flex items-center gap-2">
                           {user.full_name || user.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ')}
                           {isCurrentUser && <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-primary-500/20 text-primary-400">TÚ</span>}
                         </p>
                         <p className="text-xs text-surface-400">{user.email}</p>
                       </div>
                     </div>
                   </td>
                   <td className="px-6 py-4">
                     {isCurrentUser ? (
                       <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-accent-500/10 text-accent-400 border border-accent-500/20 flex inline-flex items-center gap-1 shadow-sm">
                         <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                           <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                         </svg>
                         SUPERADMIN
                       </span>
                     ) : (
                       <div className="relative inline-block">
                         <select
                           disabled={loadingId === user.id}
                           value={user.system_role}
                           onChange={(e) => handleRoleChange(user.id, e.target.value)}
                           className={`appearance-none bg-surface-900 border text-xs font-semibold px-3 py-1.5 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500/20 transition-colors cursor-pointer shadow-sm ${
                             user.system_role === 'superadmin' 
                              ? 'border-accent-500/30 text-accent-400 shadow-[0_0_8px_rgba(247,194,14,0.15)]' 
                              : 'border-surface-700 text-surface-200'
                           } ${loadingId === user.id ? 'opacity-50' : ''}`}
                         >
                           <option value="user">Usuario Normal</option>
                           <option value="superadmin">⚡ Superadmin</option>
                         </select>
                         {loadingId === user.id && (
                           <span className="absolute right-3 top-1/2 -translate-y-1/2 spinner w-3 h-3 border-2 border-t-accent-500/20 border-accent-500 border-solid rounded-full animate-spin"></span>
                         )}
                         <svg className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${user.system_role === 'superadmin' ? 'text-accent-400' : 'text-surface-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                         </svg>
                       </div>
                     )}
                   </td>
                   <td className="px-6 py-4">
                     <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                       {user.projects && user.projects.length > 0 ? (
                         user.projects.map((p, i) => (
                           <span key={i} className="text-[10px] px-2 py-1 bg-surface-800 border border-surface-700/50 rounded flex items-center gap-1.5 text-surface-200 shadow-sm" title={p.name}>
                             <span className="truncate max-w-[120px] font-medium">{p.name || 'Sin nombre'}</span>
                             <span className={`px-1.5 py-[1px] rounded-sm text-[8px] uppercase tracking-wider font-bold ${
                               p.role === 'owner' ? 'bg-primary-500/20 text-primary-400' :
                               p.role === 'admin' ? 'bg-accent-500/20 text-accent-400' :
                               p.role === 'editor' ? 'bg-success-500/20 text-success-400' :
                               'bg-surface-700 text-surface-400'
                             }`}>
                               {p.role}
                             </span>
                           </span>
                         ))
                       ) : (
                         <span className="text-[10px] text-surface-500 italic px-1">- Sin proyectos -</span>
                       )}
                     </div>
                   </td>
                   <td className="px-6 py-4 text-surface-200/80">
                     {format(dateObj, "d 'de' MMMM, yyyy", { locale: es })}
                   </td>
                   <td className="px-6 py-4 text-center">
                     {!isCurrentUser && (
                       <button
                         onClick={() => handleDeleteUser(user.id, user.full_name || user.email)}
                         disabled={loadingId === user.id}
                         className={`p-1.5 rounded transition-colors ${loadingId === user.id ? 'opacity-50 cursor-not-allowed' : 'text-surface-400 hover:text-danger-400 hover:bg-danger-500/10'}`}
                         title="Eliminar Cuenta"
                       >
                         {loadingId === user.id ? (
                            <span className="spinner w-4 h-4 border-2 border-surface-400 border-t-transparent rounded-full animate-spin inline-block"></span>
                         ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                         )}
                       </button>
                     )}
                   </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
