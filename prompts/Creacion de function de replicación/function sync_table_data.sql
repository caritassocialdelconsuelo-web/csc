CREATE OR REPLACE FUNCTION sync_table_data(
    p_tablename TEXT,
    p_data JSONB, 
    p_last_checkpoint BIGINT,
    p_force_update BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_seq_name TEXT := 'seq_checkPoint_' || p_tablename;
    v_new_checkpoint BIGINT;
    v_record JSONB;
    v_errors JSONB := '[]'::JSONB;
    v_result_data JSONB := '[]'::JSONB;
    v_table_id OID;
    
    v_final_data JSONB;
    v_final_metadata JSONB;
    v_pk_field TEXT;
    v_pk_value TEXT;
    v_key TEXT;
    v_val JSONB;
    v_current_db_checkpoint BIGINT;
    v_client_last_sync BIGINT;
    v_new_checkpoint_data BIGINT;
BEGIN
    -- 1. Zona de exclusión única por tabla
    SELECT oid INTO v_table_id FROM pg_class WHERE relname = p_tablename;
    IF v_table_id IS NULL THEN RAISE EXCEPTION 'Tabla % no existe', p_tablename; END IF;
    PERFORM pg_advisory_xact_lock(v_table_id::BIGINT);

    -- 2. Definir el checkpoint único para la transacción
    v_new_checkpoint := nextval(v_seq_name);

    FOR v_record IN SELECT * FROM jsonb_array_elements(p_data)
    LOOP
        v_final_data := '{}'::JSONB;
        v_final_metadata := '{}'::JSONB;
        v_pk_field := NULL;
        v_pk_value := NULL;
        v_client_last_sync := 0;

        -- Paso A: Identificar PK y extraer checkpoint del cliente (metadato)
        FOR v_key, v_val IN SELECT * FROM jsonb_each(v_record) LOOP
            IF v_key LIKE '_pk_%' THEN
                v_pk_field := substr(v_key, 5);
                v_pk_value := v_val#>>'{}';
            ELSIF v_key = 'id' AND v_pk_field IS NULL THEN
                v_pk_field := 'id';
                v_pk_value := v_val#>>'{}';
            ELSIF v_key = '_latCheckpoint' THEN
                v_client_last_sync := (v_val#>>'{}')::BIGINT;
            END IF;
        END LOOP;

        -- Paso B: Clasificar el resto de campos
        FOR v_key, v_val IN SELECT * FROM jsonb_each(v_record) LOOP
            -- Saltamos la PK (ya identificada) y el checkpoint (se maneja en columna)
            CONTINUE WHEN v_key = '_pk_' || v_pk_field OR v_key = v_pk_field OR v_key = '_checkpoint';

            IF v_key LIKE '\_%' THEN
                v_final_metadata := v_final_metadata || jsonb_build_object(substr(v_key, 2), v_val);
            ELSE
                v_final_data := v_final_data || jsonb_build_object(v_key, v_val);
            END IF;
        END LOOP;

        BEGIN
            -- 3. Lógica de Conflictos usando la columna 'checkpoint'
            EXECUTE format('SELECT checkpoint FROM %I WHERE %I = %L', 
                           p_tablename, v_pk_field, v_pk_value) 
            INTO v_current_db_checkpoint;

            IF NOT p_force_update 
               AND v_current_db_checkpoint IS NOT NULL 
               AND v_current_db_checkpoint > v_client_last_sync THEN
                
                v_errors := v_errors || jsonb_build_object(
                    'pk', v_pk_value,
                    'error', 'Conflicto: El servidor tiene cambios más recientes.',
                    'server_cp', v_current_db_checkpoint
                );
                CONTINUE;
            END IF;

            -- 4. Upsert Limpio: PK y checkpoint en raíz, el resto en JSONB
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

    -- 5. Pull: Retornamos objeto plano mezclando PK + checkpoint + data + metadata
    EXECUTE format(
        'SELECT jsonb_agg(jsonb_build_object(%L, %I, %L, checkpoint) || data || metadata)
         FROM %I 
         WHERE checkpoint > %L AND checkpoint < %L',
        v_pk_field, v_pk_field, '_checkpoint', p_tablename, p_last_checkpoint, v_new_checkpoint
    ) INTO v_result_data;

    RETURN jsonb_build_object(
        'new_checkpoint', v_new_checkpoint,
        'changes', COALESCE(v_result_data, '[]'::JSONB),
        'errors', v_errors
    );
END;
$$;

/*---------- Version 2*/
CREATE OR REPLACE FUNCTION sync_table_data(
    p_tablename TEXT,
    p_data JSONB, 
    p_last_checkpoint BIGINT,
    p_force_update BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_seq_name TEXT := 'seq_checkPoint_' || p_tablename;
    v_new_checkpoint BIGINT;
    v_record JSONB;
    v_errors JSONB := '[]'::JSONB;
    v_result_data JSONB := '[]'::JSONB;
    v_table_id OID;
    
    v_final_data JSONB;
    v_final_metadata JSONB;
    v_pk_field TEXT;
    v_pk_value TEXT;
    v_key TEXT;
    v_val JSONB;
    v_current_db_checkpoint BIGINT;
    v_client_last_sync BIGINT;
BEGIN
    -- 1. Bloqueo de exclusión por tabla
    SELECT oid INTO v_table_id FROM pg_class WHERE relname = p_tablename;
    IF v_table_id IS NULL THEN RAISE EXCEPTION 'Tabla % no existe', p_tablename; END IF;
    PERFORM pg_advisory_xact_lock(v_table_id::BIGINT);

    -- 2. Nuevo checkpoint único
    v_new_checkpoint := nextval(v_seq_name);

    FOR v_record IN SELECT * FROM jsonb_array_elements(p_data)
    LOOP
        v_final_data := '{}'::JSONB;
        v_final_metadata := '{}'::JSONB;
        v_pk_field := NULL;
        v_pk_value := NULL;
        v_client_last_sync := 0;

        -- Identificación de PK y Checkpoint previo del registro
        FOR v_key, v_val IN SELECT * FROM jsonb_each(v_record) LOOP
            IF v_key LIKE '_pk_%' THEN
                v_pk_field := substr(v_key, 5);
                v_pk_value := v_val#>>'{}';
            ELSIF v_key = 'id' AND v_pk_field IS NULL THEN
                v_pk_field := 'id';
                v_pk_value := v_val#>>'{}';
            ELSIF v_key = '_lastCheckPoint' THEN
                v_client_last_sync := (v_val#>>'{}')::BIGINT;
            END IF;
        END LOOP;

        -- Clasificación de campos
        FOR v_key, v_val IN SELECT * FROM jsonb_each(v_record) LOOP
            CONTINUE WHEN v_key = '_pk_' || v_pk_field OR v_key = v_pk_field OR v_key = '_lastCheckPoint' OR v_key = '_synchronized';

            IF v_key LIKE '\_%' THEN
                -- Metadatos (quitamos el guión bajo)
                v_final_metadata := v_final_metadata || jsonb_build_object(substr(v_key, 2), v_val);
            ELSE
                -- Datos de negocio
                v_final_data := v_final_data || jsonb_build_object(v_key, v_val);
            END IF;
        END LOOP;

        BEGIN
            -- 3. Control de Conflictos
            EXECUTE format('SELECT checkpoint FROM %I WHERE %I = %L', p_tablename, v_pk_field, v_pk_value) 
            INTO v_current_db_checkpoint;

            IF NOT p_force_update 
               AND v_current_db_checkpoint IS NOT NULL 
               AND v_current_db_checkpoint > COALESCE(v_client_last_sync, 0) THEN
                
                v_errors := v_errors || jsonb_build_object(
                    'pk', v_pk_value,
                    'error', 'Conflicto: registro modificado en servidor',
                    'server_cp', v_current_db_checkpoint
                );
                CONTINUE;
            END IF;

            -- 4. Upsert (Cambiamos status a 'created' o 'updated' según convenga al bajar)
            -- Pero en el servidor guardamos los metadatos limpios
            EXECUTE format(
                'INSERT INTO %I (%I, checkpoint, data, metadata) 
                 VALUES (%L, %L, %L, %L)
                 ON CONFLICT (%I) DO UPDATE 
                 SET checkpoint = EXCLUDED.checkpoint, data = EXCLUDED.data, metadata = EXCLUDED.metadata',
                p_tablename, v_pk_field, v_pk_value, v_new_checkpoint, v_final_data, v_final_metadata, v_pk_field
            );

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object('pk', v_pk_value, 'error', SQLERRM);
        END;
    END LOOP;

    -- 5. Pull: Retornar estructura plana mezclando columnas y JSONBs
    EXECUTE format(
        'SELECT jsonb_agg(jsonb_build_object(%L, %I, %L, checkpoint) || data || metadata)
         FROM %I 
         WHERE checkpoint > %L AND checkpoint < %L',
        v_pk_field, v_pk_field, 'lastCheckPoint', p_tablename, p_last_checkpoint, v_new_checkpoint
    ) INTO v_result_data;

    RETURN jsonb_build_object(
        'new_checkpoint', v_new_checkpoint,
        'changes', COALESCE(v_result_data, '[]'::JSONB),
        'errors', v_errors
    );
END;
$$;


//VERSION 3
CREATE OR REPLACE FUNCTION sync_table_data(
    p_tablename TEXT,
    p_data JSONB, 
    p_last_checkpoint BIGINT,
    p_force_update BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
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

    -- 3. Procesamiento de registros entrantes (Push)
    IF p_data IS NOT NULL AND jsonb_array_length(p_data) > 0 THEN
        v_new_checkpoint := nextval(v_seq_name);
        v_checkpoint_to_pull:=v_new_checkpoint;        

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
    ELSE
        v_new_checkpoint=NULL;
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
        IF v_new_checkpoint IS NULL THEN
            v_new_checkpoint=v_checkpoint_to_pull-1;
        END IF;
    ELSE
        v_new_checkpoint=p_last_checkpoint;        
    END IF;
    
    RETURN jsonb_build_object(
        'new_checkpoint', COALESCE(v_new_checkpoint, p_last_checkpoint),
        'changes', COALESCE(v_result_data, '[]'::JSONB),
        'errors', v_errors
    );
END;
$$;