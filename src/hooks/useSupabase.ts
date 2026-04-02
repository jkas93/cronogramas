import { useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Singleton-like hook for Supabase client.
 * Evita recrear el cliente en cada render, lo cual causaba bugs de infinite-loops
 * al usar el cliente dentro de las dependencias de useEffects.
 */
export function useSupabase() {
  return useMemo(() => createClient(), []);
}
