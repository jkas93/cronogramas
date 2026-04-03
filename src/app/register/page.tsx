'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md fade-in">
          <div className="glass-card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-accent-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-surface-100 mb-2">¡Cuenta Creada!</h2>
            <p className="text-sm text-surface-200/60 mb-6">
              Revisa tu correo electrónico para confirmar tu cuenta.
            </p>
            <Link href="/login" className="btn-primary inline-block">
              Ir a Iniciar Sesión
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-primary-600 to-primary-400 shadow-lg shadow-primary-500/20">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-surface-100">Crear Cuenta</h1>
          <p className="text-sm text-surface-200/60 mt-2">
            Regístrate para controlar tus proyectos
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-8">
          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-surface-200/80 mb-2">
                Nombre Completo
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                autoComplete="name"
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Pérez"
                required
                className="input-field"
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
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-surface-200/80 mb-2">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                className="input-field"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading && <span className="spinner" />}
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-surface-200/50 mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-primary-400 hover:text-primary-300 font-medium">
            Inicia Sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
