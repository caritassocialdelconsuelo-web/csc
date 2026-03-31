import { connectToCurrentUserDb } from 'src/composables/useDb';
// composables/useNetworkSync.ts (Vue 3 / Quasar)
import { onMounted, onUnmounted } from 'vue';

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
      handledOnline = () => void db?.handleOnline();
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
