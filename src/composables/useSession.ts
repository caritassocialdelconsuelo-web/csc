import type { Session } from '@supabase/supabase-js';
import { useSupabase } from './useSupabase';
import { ref } from 'vue';

const { supabase } = useSupabase();
const session = ref<Session | null>(null);

export function useSession() {
  try {
    if (!session.value) {
      void supabase.auth.getSession().then(({ data, error }) => {
        if (error) {
          console.log('error en useSession:', error);
        } else {
          session.value = data.session;
        }
      });
    }
  } catch (error) {
    console.log('Error en useSession:', error);
  }
  return { session };
}
export async function forceSession() {
  if (!session.value) {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log('error en useSession:', error);
    } else {
      session.value = data.session;
    }
  }
}
export const registerAutomaticConnect = async (newSession: Session | null) => {
  if (!session.value && newSession) {
    session.value = newSession;
    if (supabase) {
      //Aqui registra el realtime cuando se detecta una nueva sesión, lo que es útil para mantener la conexión en tiempo real incluso después de recargar la página o iniciar sesión por primera vez.
      await supabase.realtime.setAuth(); //Conecta con realtime usando el token almacenado (si existe) para mantener la sesión activa incluso después de recargar la página. Esto es crucial para que las funcionalidades de sincronización en tiempo real sigan funcionando sin interrupciones.
    } else {
      console.warn(
        '⚠️ Supabase no está inicializado. No se puede configurar Realtime con la nueva sesión.',
      );
    }
  }
};
