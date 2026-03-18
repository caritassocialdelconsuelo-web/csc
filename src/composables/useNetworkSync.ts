/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectToCurrentUserDb } from 'src/composables/useDb';
// composables/useNetworkSync.ts (Vue 3 / Quasar)
import { onMounted, onUnmounted } from 'vue';
import { useSupabase } from './useSupabase';

const {
  supabase: { value: supabase },
} = useSupabase();
let handledOnline = () => {
  return;
};
let handledOffline = () => {
  return;
};

export function useNetworkSync() {
  onMounted(async () => {
    const db = await connectToCurrentUserDb();
    if (!db) {
      console.error('No se pudo conectar a la base de datos del usuario actual.');
      return;
    } else {
      console.log('Conexión a la base de datos del usuario actual establecida.');
      handledOnline = () => void db?.handleOnline(supabase as unknown as any);
      handledOffline = () => db?.handleOffline();

      // Si la conexión es exitosa, configuramos los manejadores de eventos
      window.addEventListener('online', handledOnline);
      window.addEventListener('offline', handledOffline);

      // Si al cargar el componente ya estamos online, sincronizamos de inmediato
      if (navigator.onLine) {
        handledOnline();
      }
    }
  });

  onUnmounted(() => {
    window.removeEventListener('online', handledOnline);
    window.removeEventListener('offline', handledOffline);
  });
  return {
    sync: handledOnline,
  };
}
