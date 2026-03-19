-- ==============================================================
-- PARCHE EXPERTO v3: Security Definer Injector (Error 500)
-- Pégalo y ejecútalo en la consola SQL de Supabase
-- ==============================================================

-- ¡SOLUCIÓN MAESTRA INVASIVA PERO SEGURA!
-- Dado que tienes unas 20 políticas antiguas que dependen de esta función de seguridad,
-- REESCRIBIREMOS su cerebro interno sin tocar cómo se llama para no destruir tu viejo código.
-- Al incluir la inyección (SECURITY DEFINER), se desactivará el Loop de Recursividad 
-- y curará el Error 500 a la de YA para siempre.

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- ¡Esta etiqueta God-Mode romperá todas tus 20 recursiones en inglés de un golpe!
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
$$;

-- Nota: Si usas esta opción, NO necesitas recrear ninguna Policy ni usar DROP. 
-- Simple y letal. ¡Aprieta Run!
