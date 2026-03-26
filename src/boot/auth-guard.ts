import { useMyConfiguration } from './../composables/useGlobalConfiguration';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { boot } from 'quasar/wrappers';
import { prepareDb } from 'src/composables/useDb';
import { registerAutomaticConnect } from 'src/composables/useSession';
//import { startAllReplications } from 'src/services/database/replication';
import { useSupabase } from 'src/composables/useSupabase';
// En tu archivo principal o donde se defina las clases ppales
const modules = import.meta.glob(['/src/lib/sladb/*.ts', '/src/services/database/entities/*.ts'], {
  eager: true,
});

export default boot(({ app, router }) => {
  const { configuration: myConfiguration, setAppName } = useMyConfiguration();
  setAppName('Caritas Social', '1.0.1');
  app.config.globalProperties.$configuration = myConfiguration; //Registra myConfiguration para ser usado globalmente en todos los vue, esto permite accesar desde cualquier componente con $configuration.y sus properties
  app.provide('myConfiguration', myConfiguration);
  //Si quiero usarlo en el <Setup> debo usar const myApp = inject('myConfiguration')

  router.beforeEach(async (to) => {
    // 1. RESCATE MANUAL DEL TOKEN
    // Buscamos el token en cualquier parte del hash o de la ruta

    const fullHash = window.location.hash; // Esto trae todo lo que hay tras el primer #

    if (fullHash.includes('access_token=')) {
      console.log('🎯 Rescate manual: Token encontrado en el Hash.');

      // Extraemos los parámetros de la URL manualmente
      // Eliminamos el '#' o '#/' inicial para que URLSearchParams pueda leerlo
      const rawParams = fullHash.replace(/^#\/?/, '');
      const params = new URLSearchParams(rawParams);

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        // 2. INYECCIÓN FORZADA EN SUPABASE
        // Esto le dice a Supabase: "Aquí tienes los tokens, crea la sesión ya"
        const { data, error } = await myConfiguration.value.supabase.client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        console.log('Error al crear la sesion', error);

        if (data?.session) {
          console.log('✅ Sesión forzada con éxito para:', data.session.user.id);
          const userId = data.session.user.id;
          // 3. INICIALIZACIÓN DE SlapBase

          const db = prepareDb(userId);
          /*const p = new EPerfil({
            apellido: 'Celli',
            avatarUrl: '',
            fechaCreacion: new Date(),
            email: 'cellipablo@gmai.com',
            primerNombre: 'Pablo',
            tema: 'dark',
            username: 'pcelli',
          });
          await p.save();*/
          // Llamamos al replicador
          //if (navigator.onLine) {
          //  await startAllReplications(db, data.session.user.id);
          //}

          // Limpiamos la URL y entramos
          return '/profile';
        }

        if (error) console.error('❌ Error al inyectar sesión:', error);
      }
      return '/auth/login';
    }

    // Lógica normal para el resto de las rutas
    const {
      data: { session },
    } = await myConfiguration.value.supabase.client.auth.getSession();
    if (to.meta.requiresAuth && !session) {
      return '/auth/login';
    }
    return true;
  });

  /**
   * 3. ESCUCHA DE EVENTOS (Maneja SIGNED_IN / SIGNED_OUT en tiempo real)
   */
  myConfiguration.value.supabase.client.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      await registerAutomaticConnect(session);
      const db = prepareDb(session.user.id);
      /*---------
      const p = new EPerfil({
        apellido: 'Celli',
        avatarUrl: '',
        fechaCreacion: new Date(),
        email: 'cellipablo@gmai.com',
        primerNombre: 'Pablo',
        tema: 'dark',
        username: 'pcelli',
      });
      await p.save();
      --------------------------*/
      //await startAllReplications(db, session.user.id);
      // Solo redirigimos si estamos en una página de auth
      if (
        router.currentRoute.value.path.startsWith('/auth') ||
        window.location.hash.includes('access_token')
      ) {
        await router.push('/profile');
      }
    }
    if (event === 'SIGNED_OUT') {
      // Limpieza total y redirección
      window.location.href = '/auth/login';
    }
  });
});
