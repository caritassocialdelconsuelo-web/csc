import type { IConfiguration } from 'src/lib/interfaces/interfaces';
import { /*readonly,*/ ref } from 'vue';
import { useSupabase } from './useSupabase';
import { useSession } from './useSession';
import { useDatabase } from './useDb';

const configuration = ref<IConfiguration>({
  appName: ref('Caritas Social'),
  version: ref('1.0.0'),
  supabase: {
    client: useSupabase().supabase,
    session: useSession().session,
  },
});
export const myConfiguration = {
  configuration,
  setAppName: (name: string, version: string = '1.0.0') => {
    if (configuration.value) {
      configuration.value.appName = name;
      configuration.value.version = version;
    }
  },
  db: useDatabase().db,
};
export function useMyConfiguration() {
  return myConfiguration;
}
