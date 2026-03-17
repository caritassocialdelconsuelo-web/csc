import { connectToCurrentUserDb } from 'src/composables/useDb';
// composables/useNetworkSync.ts (Vue 3 / Quasar)
import { onMounted, onUnmounted } from 'vue';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Notify } from 'quasar';
import { SlapDB } from 'src/lib/slapdb';
import { SlapBaseEntityWithReplycation } from 'src/lib/slapdb/SlapBaseEntityWithReplycation';
import { setupSupabaseRealtimeSync } from 'src/services/database/synchronize/syncService';
import { useSupabase } from './useSupabase';
import { isSubclass } from 'src/lib/utils';

export function useNetworkSync() {
  /**
   * Esta es la función que preguntabas.
   * Ejecuta la sincronización secuencial de todas las entidades.
   */
  //Carga las tablas replicables registradas en SlapDB para sincronizarlas
  const synClasses: SlapBaseEntityWithReplycation[] = Object.values(SlapDB.entities)
    .filter((entity) => isSubclass(entity.baseClass, SlapBaseEntityWithReplycation))
    .map((entity) => entity.baseClass as unknown as SlapBaseEntityWithReplycation);

  const runFullSync = async () => {
    //Carga el usuario actualmente conectado para preparar la base de datos con su ID

    const supabase = useSupabase().supabase.value;
    const db = await connectToCurrentUserDb();

    if (!db) {
      console.warn(
        '⚠️ No hay usuario autenticado o no se puede conectar a la db local. No se puede sincronizar.',
      );
      return;
    }

    // Verificamos si realmente hay red antes de intentar
    if (!navigator.onLine) return;

    console.log('🔄 SlapDb: Iniciando sincronización total...');

    for (const synClass of synClasses) {
      try {
        const errors = await db?.syncTable(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supabase as SupabaseClient<any, any, 'public', any, any>,
          synClass,
        );

        if (errors && errors.length > 0) {
          console.warn(`⚠️ Conflictos sincronizando en ${synClass.name}:`, errors);
          // Opcional: Notificar al usuario que hay conflictos pendientes
        }
      } catch (error) {
        console.error(`❌ Error sincronizando tabla ${synClass.name}:`, error);
      }
    }
    setTimeout(
      () => {
        void runFullSync();
      },
      import.meta.env.VITE_SUPABASE_MS_RETRY || 1000,
    ); //Reintenta la sincronización completa después de un tiempo, para asegurar que se resuelvan los conflictos pendientes y se sincronicen los cambios que no se pudieron sincronizar en el primer intento por estar el dispositivo offline o por cualquier otro error temporal.
  };

  // Manejadores de eventos de red
  const handleOnline = () => {
    Notify.create({
      type: 'positive',
      message: 'Conexión recuperada. Sincronizando datos...',
      timeout: 2000,
    });
    void runFullSync();
  };

  const handleOffline = () => {
    Notify.create({
      type: 'warning',
      message: 'Sin conexión a internet. Trabajando en modo local.',
      timeout: 3000,
    });
  };

  onMounted(async () => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Si al cargar el componente ya estamos online, sincronizamos de inmediato
    if (navigator.onLine) {
      await runFullSync();
    }
    for (const synClass of synClasses) {
      await setupSupabaseRealtimeSync(synClass);
    }
  });

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  });

  // Exponemos la función por si quieres dispararla manualmente desde un botón
  return {
    runFullSync,
  };
}
