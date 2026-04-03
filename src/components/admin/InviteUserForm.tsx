'use client';

import { useState } from 'react';
import { inviteUser } from '@/app/actions/admin';

export function InviteUserForm() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName) return;
    
    setLoading(true);
    setStatus(null);
    
    try {
      await inviteUser(email, fullName);
      setStatus({ type: 'success', message: `Invitación enviada exitosamente a ${email}` });
      setEmail('');
      setFullName('');
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Error enviando invitación' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 mb-8 fade-in">
      <h3 className="text-lg font-bold text-surface-100 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
        Invitar Nuevo Usuario
      </h3>
      
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-surface-200/80 mb-1">Nombre Completo</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ej: Juan Pérez"
            required
            className="w-full bg-surface-900 border border-surface-700 rounded-lg text-sm px-3 py-2 text-surface-100 focus:outline-none focus:border-accent-500 transition-colors"
          />
        </div>
        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-surface-200/80 mb-1">Correo Electrónico</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@empresa.com"
            required
            className="w-full bg-surface-900 border border-surface-700 rounded-lg text-sm px-3 py-2 text-surface-100 focus:outline-none focus:border-accent-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !email || !fullName}
          className="btn-primary flex items-center justify-center gap-2 h-[38px] px-6 flex-shrink-0"
        >
          {loading ? <span className="spinner"></span> : 'Enviar Invitación'}
        </button>
      </form>
      
      {status && (
        <div className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
          status.type === 'success' ? 'bg-success-500/10 text-success-400 border border-success-500/20' : 'bg-danger-500/10 text-danger-400 border border-danger-500/20'
        }`}>
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {status.type === 'success' 
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            }
          </svg>
          {status.message}
        </div>
      )}
    </div>
  );
}
