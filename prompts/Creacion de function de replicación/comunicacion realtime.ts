supabase
  .channel('table-db-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'TuTabla' }, (payload) => {
    const serverCheckpoint = payload.new.metadata.checkpoint;
    // Si el cambio viene de otro cliente, sincronizamos
    if (serverCheckpoint > localCheckpoint) {
      debouncedSync(tableName);
    }
  })
  .subscribe();
