CREATE OR REPLACE FUNCTION admin_provision_slap_table(p_table_name TEXT)
RETURNS JSONB AS $$

DECLARE
    v_seq_name TEXT := 'seq_checkPoint_' || p_table_name;
    v_has_permission BOOLEAN;
BEGIN
    -- 1. Verificación de Seguridad via auth.uid()
    -- Buscamos en raw_app_meta_data si el campo 'is_admin' es true
    SELECT 
        COALESCE((raw_app_meta_data->>'is_admin')::BOOLEAN, FALSE) INTO v_has_permission
    FROM auth.users 
    WHERE id = auth.uid();

    -- Si no es admin, bloqueamos la ejecución
    IF NOT v_has_permission THEN
        RAISE EXCEPTION 'Acceso denegado: El usuario % no tiene permisos de administrador.', auth.uid();
    END IF;

    -- 2. Crear la Secuencia
    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I START WITH 1', v_seq_name);

    -- 3. Crear la Tabla (Estructura base)
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            id string PRIMARY KEY ,
            checkpoint BIGINT DEFAULT 0,
            data JSONB,
            metadata JSONB
        )', p_table_name);

    -- 4. Crear Índice de Sincronización
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (checkpoint)', 
        'idx_sync_' || p_table_name, p_table_name);

    RETURN jsonb_build_object(
        'status', 'success',
        'table', p_table_name,
        'provisioned_by', auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;