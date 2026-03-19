'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [id, setId] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function getProfile() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setId(user.id);
        setEmail(user.email || '');

        const { data } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (data) {
          setFullName(data.full_name || '');
        }
      }
      setLoading(false);
    }

    getProfile();
  }, [supabase]);

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      
      setSuccessMessage('¡Perfil actualizado con éxito!');
      router.refresh();
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
    } catch (error: any) {
      alert('Error actualizando perfil: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-2xl mx-auto flex justify-center items-center min-h-[50vh]">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-surface-100">Mi Perfil</h1>
        <p className="text-sm text-surface-200/60 mt-1">
          Gestiona tu información personal y configuración
        </p>
      </div>

      <div className="glass-card p-8">
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-surface-700/50">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-500 to-accent-400 flex items-center justify-center shadow-lg shadow-accent-500/20 text-4xl font-bold text-primary-900">
             {fullName ? fullName.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-surface-100">{fullName || 'Usuario'}</h2>
            <p className="text-sm text-surface-400">{email}</p>
            <span className="inline-block mt-2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20">
              Cuenta Profesional
            </span>
          </div>
        </div>

        <form onSubmit={updateProfile} className="space-y-6">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-surface-200/80 mb-2">
              Nombre Completo
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej. Juan Pérez"
              className="input-field max-w-md"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-surface-200/80 mb-2">
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              disabled
              className="input-field max-w-md opacity-50 cursor-not-allowed"
            />
            <p className="text-[11px] text-surface-400 mt-1.5">
              El correo está vinculado a tu cuenta para validación segura y no puede ser modificado aquí.
            </p>
          </div>

          {successMessage && (
            <div className="p-3 max-w-md rounded-lg bg-success-500/10 border border-success-500/20 text-success-400 text-sm flex items-center gap-2 fade-in">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {successMessage}
            </div>
          )}

          <div className="pt-4 border-t border-surface-700/50 flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary min-w-[140px] flex justify-center"
            >
              {saving ? <span className="spinner"></span> : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
