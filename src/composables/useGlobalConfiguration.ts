import type { IConfiguration } from 'src/lib/interfaces/interfaces';
import { readonly, ref } from 'vue';
import { useSupabase } from './useSupabase';
import { useSession } from './useSession';
import { useDatabase } from './useDb';

const configuration = ref<IConfiguration>({
  appName: readonly(ref('Caritas Social')),
  version: readonly(ref('1.0.0')),
  supabase: {
    client: useSupabase().supabase,
    session: (await useSession()).session,
  },
  db: useDatabase().db,
});
export const myConfiguration = {
  configuration: configuration,
  setAppName: (name: string, version: string = '1.0.0') => {
    configuration.value.appName = name;
    configuration.value.version = version;
  },
}; //Ver como funciona readonly aqui.
export function useMyConfiguration() {
  return myConfiguration;
}
