/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSlapDBCallBack, type SlapDB } from 'src/lib/slapdb';
import { ref } from 'vue';
import { getCurrentUser } from './useSupabase';
type DATABASE_CLASS = /*Definir la clase usada por la base de datos*/ SlapDB;
const db = ref<DATABASE_CLASS>();
const loading = ref(false);
const error = ref(null);

export function useDatabase(
  config: { [key: string]: any },
  createFnc?: (config: { [key: string]: any }) => SlapDB | null,
) {
  try {
    if (!db.value && createFnc) {
      const dbCreated = createFnc(config);
      if (dbCreated) {
        db.value = dbCreated;
      }
    }
  } catch (error) {
    console.log('Error en useDatabase:', error);
  }
  return { db, loading, error /*, fetchData*/ };
}
export function prepareDb(userId: string, withAutoSyncronize = true) {
  //while (Object.keys(registeredEntitys).length === 0) {
  //  await awaiting(100); // Esperar 100ms antes de volver a comprobar
  //}
  const {
    db: { value: db },
  } = useDatabase(
    { name: `dbCSC_${userId}`, version: 1, withAutoSyncronize },
    createSlapDBCallBack,
  );

  if (db) {
    return db;
  }
}
export async function connectToCurrentUserDb() {
  const user = await getCurrentUser();
  if (!user) {
    console.warn('⚠️ No hay usuario autenticado. No se puede sincronizar en RealTime.');
    return;
  }
  return prepareDb(user?.id || '');
}
