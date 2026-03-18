--VERSION 4
CREATE OR REPLACE FUNCTION sync_table_data(
    p_tablename TEXT,
    p_data JSONB, 
    p_last_checkpoint BIGINT,
    p_force_update BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
AS $$
DECLARE
    v_seq_name TEXT := 'seq_checkPoint_' || p_tablename;
    v_new_checkpoint BIGINT;
    v_record JSONB;
    v_errors JSONB := '[]'::JSONB;
    v_result_data JSONB := '[]'::JSONB;
    v_table_oid OID;
    
    v_final_data JSONB;
    v_final_metadata JSONB;
    v_pk_field TEXT; -- Nombre de la PK detectado por Diccionario
    v_pk_value TEXT;
    v_key TEXT;
    v_val JSONB;
    v_current_db_checkpoint BIGINT;
    v_client_last_sync BIGINT;
    v_client_data_count BIGINT;
    v_new_checkpoint_data BIGINT;
    v_checkpoint_to_pull BIGINT;
    v_last_checkpoint BIGINT;
    v_payload JSONB;
BEGIN
    -- 1. Obtener OID y Nombre de la Clave Primaria desde el Diccionario de Datos
    SELECT c.oid, a.attname INTO v_table_oid, v_pk_field
    FROM pg_class c
    JOIN pg_index i ON c.oid = i.indrelid
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey)
    WHERE c.relname = p_tablename AND i.indisprimary;

    IF v_table_oid IS NULL THEN 
        RAISE EXCEPTION 'La tabla % no existe o no tiene una Clave Primaria definida.', p_tablename; 
    END IF;

    -- Bloqueo de exclusión para evitar condiciones de carrera en el checkpoint
    PERFORM pg_advisory_xact_lock(v_table_oid::BIGINT);
    v_new_checkpoint := NULL; -- Inicializamos el nuevo checkpoint como NULL, se asignará al primer registro procesado o al final si no hay registros entrantes
    v_checkpoint_to_pull := NULL; -- Inicializamos el checkpoint para el pull como NULL, se asignará al nuevo checkpoint si hay registros entrantes o al max checkpoint de la tabla si no hay registros entrantes
    -- 3. Procesamiento de registros entrantes (Push)
    IF p_data IS NOT NULL AND jsonb_array_length(p_data) > 0 THEN
        FOR v_record IN SELECT * FROM jsonb_array_elements(p_data)
        LOOP
            v_final_data := '{}'::JSONB;
            v_final_metadata := '{}'::JSONB;
            v_pk_value := NULL;
            v_client_last_sync := 0;

            -- Extraer PK y Checkpoint del cliente (usando el nombre v_pk_field detectado)
            -- Buscamos tanto en 'id'/'dni' como en los decorados '_pk_id'
            v_pk_value := COALESCE(
                v_record->>v_pk_field, 
                v_record->>('_pk_' || v_pk_field)
            );
            
            v_client_last_sync := COALESCE((v_record->>'_lastCheckPoint')::BIGINT, 0);

            -- Clasificación de campos omitiendo infraestructura de sincronización
            FOR v_key, v_val IN SELECT * FROM jsonb_each(v_record) LOOP
                -- Saltamos la PK (ya extraída) y campos de control local
                CONTINUE WHEN v_key = v_pk_field 
                           OR v_key = '_pk_' || v_pk_field 
                           OR v_key = '_lastCheckPoint' 
                           OR v_key = '_synchronized';

                IF v_key LIKE '\_%' THEN
                    -- Es un metadato (ej: _status, _updatedAt) -> va a la columna 'metadata' sin el "_"
                    v_final_metadata := v_final_metadata || jsonb_build_object(substr(v_key, 2), v_val);
                ELSE
                    -- Es un campo de negocio -> va a la columna 'data'
                    v_final_data := v_final_data || jsonb_build_object(v_key, v_val);
                END IF;
            END LOOP;

            BEGIN
                -- 4. Control de Conflictos
                EXECUTE format('SELECT checkpoint FROM %I WHERE %I = %L', p_tablename, v_pk_field, v_pk_value) 
                INTO v_current_db_checkpoint;

                IF NOT p_force_update 
                   AND v_current_db_checkpoint IS NOT NULL 
                   AND v_current_db_checkpoint > v_client_last_sync THEN
                    
                    v_errors := v_errors || jsonb_build_object(
                        'pk', v_pk_value,
                        'error', 'Conflicto el server tiene una versión más nueva',
                        'server_cp', v_current_db_checkpoint
                    );
                    CONTINUE;
                END IF;
                IF v_new_checkpoint IS NULL THEN --compruebo si no lo defini todavía y genero uno nuevo, si ya lo definí, lo uso para todos los registros, así garantizo que todos los cambios de esta sincronización tengan el mismo checkpoint y se puedan agrupar en el pull
                    v_new_checkpoint := nextval(v_seq_name);
                    v_checkpoint_to_pull:=v_new_checkpoint; 
                END IF;
                -- 5. Upsert atómico
                EXECUTE format(
                    'INSERT INTO %I (%I, checkpoint, data, metadata) 
                     VALUES (%L, %L, %L, %L)
                     ON CONFLICT (%I) DO UPDATE 
                     SET checkpoint = EXCLUDED.checkpoint, 
                         data = EXCLUDED.data, 
                         metadata = EXCLUDED.metadata',
                    p_tablename, v_pk_field, v_pk_value, v_new_checkpoint, v_final_data, v_final_metadata, v_pk_field
                );

            EXCEPTION WHEN OTHERS THEN
                v_errors := v_errors || jsonb_build_object('pk', v_pk_value, 'error', SQLERRM);
            END;
        END LOOP;
    END IF;

    IF v_checkpoint_to_pull IS NULL THEN
        EXECUTE format(
            'SELECT max(checkpoint) FROM %I WHERE checkpoint >= %L '
            , p_tablename,  p_last_checkpoint
        ) INTO v_checkpoint_to_pull ;
        IF  v_checkpoint_to_pull IS NOT NULL THEN
            v_checkpoint_to_pull=v_checkpoint_to_pull+1;
        END IF;
    END IF;
    IF v_checkpoint_to_pull IS NOT NULL THEN
    -- 6. Pull: Obtener cambios desde el último checkpoint
    -- Construimos el JSON de salida inyectando el nombre de PK correcto
        EXECUTE format(
            'SELECT jsonb_agg(
                jsonb_build_object(%L, %I, %L, checkpoint) || data || metadata
            )
            FROM %I 
            WHERE checkpoint > %L AND checkpoint < %L',
            v_pk_field, v_pk_field, 'lastCheckPoint', p_tablename, p_last_checkpoint, v_checkpoint_to_pull
        ) INTO v_result_data ;
    END IF;
    if(v_new_checkpoint IS NOT NULL) THEN
        v_payload := jsonb_build_object(
            't', v_table_oid,
            'c', v_new_checkpoint
        );
        SET LOCAL "request.jwt.claims" = '{"sub": "00000000-0000-0000-0000-000000000000"}'; -- Asignamos un JWT con un sub neutro para que realtime lo acepte sin problemas, ya que realtime requiere un JWT válido aunque no lo use para nada              
        PERFORM
            realtime.send( --Solo usamos realtime si hubo nuevos registros actualizados, para no generar eventos innecesarios
            v_payload::JSONB, -- Payload
            'sync'::text, -- Event name
            'slbSync'::text, -- Topic
            false -- Public / Private flag
        ) ; 
    ELSE
        v_checkpoint_to_pull := v_checkpoint_to_pull-1; -- Si no hubo nuevos registros, el checkpoint para el pull es el último checkpoint de la tabla, que es el valor que se le asignó a v_checkpoint_to_pull, pero como en la consulta del pull usamos "checkpoint > p_last_checkpoint AND checkpoint < v_checkpoint_to_pull", si no hubo nuevos registros, tenemos que restar 1 para incluir el último checkpoint de la tabla en el pull
    END IF;
    RETURN jsonb_build_object(
        'new_checkpoint', GREATEST(COALESCE(v_new_checkpoint,0), COALESCE(v_checkpoint_to_pull,0), COALESCE(p_last_checkpoint,0)),
        'changes', COALESCE(v_result_data, '[]'::JSONB),
        'iod', v_table_oid,
        'errors', v_errors
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION sync_table_data() TO authenticated;