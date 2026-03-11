import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '', // e.g. https://xyzcompany.supabase.co
  import.meta.env.VITE_SUPABASE_ANON_KEY || '', // anon key for browsers
  // optional options object here
);
