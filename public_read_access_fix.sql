-- Solución PULSO: Habilitar lectura pública de Anexos solo si provienen de Proyectos con share_token
-- Pega este código en el SQL Editor de tu panel de Supabase y escúchalo correr (Run).

-- 1. Asegurar que las políticas RLS están habilitadas para las tablas implicadas
ALTER TABLE public.partidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_progress ENABLE ROW LEVEL SECURITY;

-- 2. Crear las Políticas para habilitar el rol "anon" (Anónimo) a Hacer un SELECT solo a las cosas de los proyectos compartibles

-- Para la tabla partidas
DROP POLICY IF EXISTS "Permitir select para anon de partidas compartidas" ON public.partidas;
CREATE POLICY "Permitir select para anon de partidas compartidas"
ON public.partidas
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
    AND p.share_token IS NOT NULL
  )
);

-- Para la tabla items
DROP POLICY IF EXISTS "Permitir select para anon de items compartidos" ON public.items;
CREATE POLICY "Permitir select para anon de items compartidos"
ON public.items
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.partidas pa
    JOIN public.projects p ON pa.project_id = p.id
    WHERE pa.id = partida_id
    AND p.share_token IS NOT NULL
  )
);

-- Para la tabla activities
DROP POLICY IF EXISTS "Permitir select para anon d activities compartidas" ON public.activities;
CREATE POLICY "Permitir select para anon d activities compartidas"
ON public.activities
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.items i
    JOIN public.partidas pa ON i.partida_id = pa.id
    JOIN public.projects p ON pa.project_id = p.id
    WHERE i.id = item_id
    AND p.share_token IS NOT NULL
  )
);

-- Para la tabla daily_progress
DROP POLICY IF EXISTS "Permitir select para anon de progreso progresos" ON public.daily_progress;
CREATE POLICY "Permitir select para anon de progreso progresos"
ON public.daily_progress
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.activities a
    JOIN public.items i ON a.item_id = i.id
    JOIN public.partidas pa ON i.partida_id = pa.id
    JOIN public.projects p ON pa.project_id = p.id
    WHERE a.id = activity_id
    AND p.share_token IS NOT NULL
  )
);

-- (Opcional si projects aun no lo tiene)
DROP POLICY IF EXISTS "Permitir select para anon d projects x token" ON public.projects;
CREATE POLICY "Permitir select para anon d projects x token"
ON public.projects
FOR SELECT
TO anon
USING (share_token IS NOT NULL);
