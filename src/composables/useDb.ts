/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSlapDBCallBack, type SlapDB } from 'src/lib/slapdb';
import { ref } from 'vue';
type DATABASE_CLASS = /*Definir la clase usada por la base de datos*/ SlapDB;
const db = ref<DATABASE_CLASS>();
const loading = ref(false);
const error = ref(null);

export function useDatabase(
  config: { [key: string]: any },
  createFnc: (config: { [key: string]: any }) => DATABASE_CLASS,
) {
  try {
    if (!db.value) {
      db.value = createFnc(config);
    }
  } catch (error) {
    console.log('Error en useDatabase:', error);
  }
  return { db, loading, error /*, fetchData*/ };
}
export async function prepareDb(userId: string) {
  const {
    db: { value: db },
  } = useDatabase({ name: `dbCSC_${userId}`, version: 1 }, createSlapDBCallBack);

  if (db) {
    await db.open();
    return db;
  }
}
