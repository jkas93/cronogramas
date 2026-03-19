-- =============================================================
-- SCRIPT DE CONFIGURACIÓN P.U.L.S.O. - GESTIÓN DE EQUIPO
-- RUN THIS IN SUPABASE SQL EDITOR
-- =============================================================

-- 1. Agregar columna de 'email' a profiles si no existe (vital para invitaciones)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='profiles' AND column_name='email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;
END $$;

-- 2. Actualizar profiles existentes con su email desde auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id;

-- 3. Actualizar la función handle_new_user para que guarde el email en nuevos registros
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Crear Función RPC para buscar usuarios por Email 
-- (Porque desde el frontend no podemos tocar auth.users por seguridad)
CREATE OR REPLACE FUNCTION get_profile_by_email(search_email TEXT)
RETURNS TABLE (id UUID, full_name TEXT, avatar_url TEXT, email TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.full_name, p.avatar_url, p.email
  FROM public.profiles p
  WHERE p.email ILIKE search_email;
END;
$$;

-- 5. Dar permisos sobre la función a usuarios autenticados
GRANT EXECUTE ON FUNCTION get_profile_by_email(TEXT) TO authenticated;

-- DONE! Todo listo para usar la Gestión de Equipos.
