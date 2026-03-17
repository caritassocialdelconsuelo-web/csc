export async function syncSlapTable(tableName: string, batchSize: number = 10) {
  const syncMeta = await db.table('_sync_meta').get(tableName);
  const lastCp = syncMeta?.checkpoint || 0;

  // 1. Obtener registros sucios (created, updated, deleted)
  const dirtyItems = await db
    .table(tableName)
    .filter(
      (item) =>
        !item._synchronized && ['created', 'updated', 'deleted', 'pending'].includes(item._status),
    )
    .limit(batchSize)
    .toArray();

  const { data, error } = await supabase.rpc('sync_table_data', {
    p_tablename: tableName,
    p_data: dirtyItems,
    p_last_checkpoint: lastCp,
    p_force_update: false,
  });

  if (error) throw error;

  await db.transaction('rw', [db.table(tableName), db.table('_sync_meta')], async () => {
    // 2. Aplicar cambios remotos (PULL)
    for (const remoteChange of data.changes) {
      // remoteChange ya trae su _status (deleted, updated, etc.) desde el servidor
      await db.table(tableName).put({
        ...remoteChange,
        _synchronized: true, // El servidor confirma que esta es la versión oficial
      });
    }

    // 3. Confirmación de subida (PUSH)
    // Para los que enviamos y no dieron error, los marcamos como sincronizados
    // conservando su estado actual (si era 'deleted', sigue siendo 'deleted' pero sincronizado)
    const successIds = dirtyItems
      .filter((item) => !data.errors.some((e) => e.pk == (item.id || item._pk_dni)))
      .map((item) => item.id || item._pk_dni);

    if (successIds.length > 0) {
      // Usamos modify para no machacar otros campos, solo cambiamos la bandera
      await db.table(tableName).where(':id').anyOf(successIds).modify({ _synchronized: true });
    }

    // 4. Actualizar checkpoint global
    await db.table('_sync_meta').put({
      id: tableName,
      checkpoint: data.new_checkpoint,
    });
  });

  return data.errors;
}
