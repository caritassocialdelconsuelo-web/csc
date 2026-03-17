CREATE OR REPLACE FUNCTION admin_execute_dynamic_sql(p_sql_query TEXT)
RETURNS JSONB AS $$
DECLARE
    v_has_permission BOOLEAN;
BEGIN
    -- 1. Verificación de Seguridad (Reutilizando tu lógica de auth.users)
    SELECT 
        COALESCE((raw_app_meta_data->>'is_admin')::BOOLEAN, FALSE) INTO v_has_permission
    FROM auth.users 
    WHERE id = auth.uid();

    IF NOT v_has_permission THEN
        RAISE EXCEPTION 'Acceso denegado: Se requieren permisos de super-administrador.';
    END IF;

    -- 2. Ejecución del SQL arbitrario
    -- Nota: EXECUTE no devuelve filas a menos que uses INTO o sea un loop.
    EXECUTE p_sql_query;

    RETURN jsonb_build_object(
        'status', 'success',
        'executed_at', NOW(),
        'query_preview', left(p_sql_query, 50) || '...'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;