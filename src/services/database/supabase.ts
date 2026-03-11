import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '', // e.g. https://xyzcompany.supabase.co
  import.meta.env.VITE_SUPABASE_ANON_KEY || '', // anon key for browsers
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Esto asegura que use un sistema de guardado estándar
      // y ayuda a mitigar problemas de concurrencia en local
      storageKey: 'slap-db-auth-token',
    }
  }
  // optional options object here
);
