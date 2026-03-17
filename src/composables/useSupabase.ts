import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ref } from 'vue';
const supabase = ref<SupabaseClient>(
  createClient(
    import.meta?.env?.VITE_SUPABASE_URL || process?.env?.VITE_SUPABASE_URL || '', // e.g. https://xyzcompany.supabase.co
    import.meta?.env?.VITE_SUPABASE_ANON_KEY || process?.env?.VITE_SUPABASE_ANON_KEY || '', // anon key for browsers
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // Esto asegura que use un sistema de guardado estándar
        // y ayuda a mitigar problemas de concurrencia en local
        storageKey: 'slap-db-auth-token',
      },
    },
    // optional options object here
  ),
);
export function useSupabase() {
  return { supabase: supabase };
}
export async function getCurrentUser() {
  try {
    if (supabase.value) {
      return (await supabase.value.auth.getUser()).data.user;
    } else {
      console.warn('⚠️ Supabase no está inicializado. No se puede obtener el usuario actual.');
      return null;
    }
  } catch (error) {
    console.error('Error obteniendo el usuario actual:', error);
    return null;
  }
}
