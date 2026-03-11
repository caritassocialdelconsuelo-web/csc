import type { Session } from '@supabase/supabase-js';
import { supabase } from 'src/services/database/supabase';
import { ref } from 'vue';

const session = ref<Session | null>();

export async function useSession() {
  try {
    if (!session.value) {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.log('error en useSession:', error);
      } else {
        session.value = data.session;
      }
    }
  } catch (error) {
    console.log('Error en useSession:', error);
  }
  return { session };
}
export const registerAutomaticConnect = (newSession: Session | null) => {
  if (!session.value && newSession) {
    session.value = newSession;
  }
}
