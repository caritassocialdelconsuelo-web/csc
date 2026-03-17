import { useSupabase } from 'src/composables/useSupabase';
import { SlapDB } from 'src/lib/slapdb';
import { SlapBaseEntityWithReplycation } from 'src/lib/slapdb/SlapBaseEntityWithReplycation';
import { connectToCurrentUserDb } from 'src/composables/useDb';
import { REALTIME_SUBSCRIBE_STATES, type SupabaseClient } from '@supabase/supabase-js';
import { isSubclass } from 'src/lib/utils';

const {
  supabase: { value: supabase },
} = useSupabase();

export async function setupSupabaseRealtimeSync(synClass: SlapBaseEntityWithReplycation) {
  const channel = supabase.channel(`sync_${synClass.syncTableName}`);
  //Carga el usuario actualmente conectado para preparar la base de datos con su ID

  if (isSubclass(synClass, SlapBaseEntityWithReplycation)) {
    const db = await connectToCurrentUserDb();
    if (db) {
      const syncTableName = synClass.syncTableName;
      const localTableName = SlapDB.entities[synClass.name]?.localTableName ?? '';
      console.log(
        `🔔 Configurando Realtime para ${localTableName} (tabla remota: ${syncTableName})`,
      );
      await channel.unsubscribe(); // Evitamos duplicados si ya existía
      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: `"${syncTableName}"` },
          (payload) => {
            // Si recibimos un cambio y no somos nosotros (basado en el checkpoint)
            void handleRemoteChange(db, synClass, localTableName, payload);
          },
        )

        .subscribe((status) => {
          if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
            console.log(
              `✅ Conectado a Realtime para ${localTableName} (tabla remota: ${syncTableName})`,
            );
            // Al conectar o reconectar el socket, disparamos sync para recuperar lo perdido en el downtime
            void db?.syncTable(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              supabase as SupabaseClient<any, any, 'public', any, any>,
              synClass,
            );
          }

          if (status === REALTIME_SUBSCRIBE_STATES.CLOSED) {
            console.warn('⚠️ Conexión con Supabase perdida.');
          }
        });
      return channel;
    } else {
      console.warn(
        '⚠️ No se pudo conectar a la base de datos local. Realtime no se configurará para esta tabla.',
      );
    }
  } else {
    console.warn(
      `⚠️ La entidad/clase ${synClass.name} no es replicable o no está registrada. Realtime no se configurará para esta tabla.`,
    );
  }
  return null;
}

async function handleRemoteChange(
  db: SlapDB,
  synClass: SlapBaseEntityWithReplycation,
  localTableName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any,
) {
  const serverCp = payload.new?.checkpoint;
  if (db) {
    const localMeta = await db.table('_sync_meta').get(localTableName);
    if (serverCp > (localMeta?.checkpoint || 0)) {
      // Solo sincronizamos si el servidor tiene algo que no conocemos
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.syncTable(supabase as SupabaseClient<any, any, 'public', any, any>, synClass);
    }
  }
}
