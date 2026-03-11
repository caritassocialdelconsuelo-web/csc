import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  // Captura cualquier ruta que empiece con access_token para que no de 404
  {
    path: '/access_token=:catchAll(.*)',
    name: 'supabase-callbak',
    component: () => import('pages/LoginPage.vue'), // O una página de "Procesando..."
    meta: { isCallback: true },
  },
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        redirect: '/profile',
      },
      {
        path: 'profile',
        component: () => import('pages/ProfilePage.vue'),
        meta: { requiresAuth: true }, // Marca para el guardián de rutas
      },

      //{ path: '', component: () => import('pages/IndexPage.vue') }
    ],
  },
  // Layout para Login/Registro (usualmente sin barras laterales ni menús)
  {
    path: '/auth',
    component: () => import('layouts/BlankLayout.vue'), // O usa el mismo MainLayout
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('pages/LoginPage.vue'),
      },
      {
        path: 'register',
        name: 'register',
        component: () => import('pages/RegisterPage.vue'),
      },
    ],
  },

  // Captura de errores 404
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
