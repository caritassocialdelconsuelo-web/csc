import type { useMyConfiguration } from './composables/useGlobalConfiguration';
// 1. Importamos el tipo de tu composable
import 'vue';
type ConfigurationInstance = ReturnType<typeof useMyConfiguration>['configuration'];

// 2. Ampliamos la interfaz de ComponentCustomProperties
declare module 'vue' {
  interface ComponentCustomProperties {
    $configuration: ConfigurationInstance;
  }
}

export {}; // Esto es necesario para que TS lo trate como un módulo
