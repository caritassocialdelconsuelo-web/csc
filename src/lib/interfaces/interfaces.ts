/* eslint-disable @typescript-eslint/no-explicit-any */
import type { useSupabase } from 'src/composables/useSupabase';
import type { Session } from '@supabase/supabase-js';
//import type { DATABASE_CLASS } from 'src/composables/useDb';
import type { Ref } from 'vue';
import type { SlapDB } from '../slapdb';
type TipoSupabaseClient<T> = T extends (...args: any[]) => { supabase: infer U } ? U : never;
export interface IConfiguration {
  appName: Ref<string>;
  version: Ref<string>;
  supabase: {
    client: TipoSupabaseClient<typeof useSupabase>;
    session: Ref<Session | null | undefined>;
  };
  db: Ref<SlapDB | undefined, SlapDB | undefined>;
}
