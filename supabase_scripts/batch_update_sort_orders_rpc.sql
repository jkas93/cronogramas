-- RPC para optimizar el drag and drop (Re-ordenamiento en dhtmlx-gantt)
-- Evita hacer solicitudes individuales de actualización N veces.

CREATE OR REPLACE FUNCTION public.batch_update_sort_orders(p_table_name text, p_updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r record;
BEGIN
    -- Lista blanca de seguridad para prevenir inyección SQL
    IF p_table_name NOT IN ('partidas', 'items', 'activities') THEN
        RAISE EXCEPTION 'Table % is not allowed for dynamic batch updates', p_table_name;
    END IF;

    -- Iteramos sobre el JSON array enviado desde el cliente
    -- Formato esperado: [{"id": "uuid...", "sort_order": 0}, {"id": "uuid...", "sort_order": 1}]
    FOR r IN SELECT * FROM jsonb_to_recordset(p_updates) AS x(id uuid, sort_order int)
    LOOP
        EXECUTE format('UPDATE public.%I SET sort_order = $1 WHERE id = $2', p_table_name)
        USING r.sort_order, r.id;
    END LOOP;
END;
$$;

-- Otorgamos premisos a los usuarios autenticados
GRANT EXECUTE ON FUNCTION public.batch_update_sort_orders(text, jsonb) TO authenticated;
