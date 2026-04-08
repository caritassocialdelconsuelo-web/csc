<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar
        style="
          background: #060b47;
          background: linear-gradient(
            90deg,
            rgba(6, 11, 71, 1) 0%,
            rgba(87, 130, 199, 0.81) 77%,
            rgba(83, 163, 237, 0.55) 100%
          );
        "
      >
        <q-img
          :src="'/icons/icon-512x512.png'"
          spinner-color="white"
          style="height: 48px; max-width: 48px"
        />
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>Caritas Social (ntra. señora del Consuelo) App </q-toolbar-title>

        <div>{{ $configuration.value?.appName }} v{{ $configuration.value?.version }}</div>
        <q-separator vertical inset />
        <q-toggle
          v-model="$q.dark.isActive"
          :label="'Modo'"
          :checked-icon="biMoon"
          :unchecked-icon="tiLightBulb"
          color="blue-14"
        />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label
          header
          style="
            background: #994a00;
            background: linear-gradient(
              180deg,
              rgba(153, 74, 0, 1) 0%,
              rgba(250, 238, 150, 1) 35%,
              rgba(247, 218, 101, 1) 70%,
              rgba(161, 102, 0, 1) 100%
            );
            color: #060b47;
            font-size: large;
            font-weight: bold;
            justify-content: center;
            display: flex;
            align-items: center;
          "
        >
          Menu de la aplicación
        </q-item-label>

        <EssentialLink v-for="link in linksList" :key="link.title" v-bind="link" />
      </q-list>
    </q-drawer>

    <q-page-container
      style="
        background-image: url('/elconsuelobg.png');
        background-repeat: no-repeat;
        background-size: cover;
      "
    >
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import EssentialLink, { type EssentialLinkProps } from 'components/EssentialLink.vue';
import { tiLightBulb } from '@quasar/extras/themify';
import { biMoon } from '@quasar/extras/bootstrap-icons';

const linksList: EssentialLinkProps[] = [
  {
    title: 'Docs',
    caption: 'quasar.dev',
    icon: 'school',
    link: 'https://quasar.dev',
    target: '_blank',
  },
  {
    title: 'Github',
    caption: 'github.com/quasarframework',
    icon: 'code',
    link: 'https://github.com/quasarframework',
    target: '_blank',
  },
  {
    title: 'Discord Chat Channel',
    caption: 'chat.quasar.dev',
    icon: 'chat',
    link: 'https://chat.quasar.dev',
    target: '_blank',
  },
  {
    title: 'Forum',
    caption: 'forum.quasar.dev',
    icon: 'record_voice_over',
    link: 'https://forum.quasar.dev',
    target: '_blank',
  },
  {
    title: 'Twitter',
    caption: '@quasarframework',
    icon: 'rss_feed',
    link: 'https://twitter.quasar.dev',
    target: '_blank',
  },
  {
    title: 'Facebook',
    caption: '@QuasarFramework',
    icon: 'public',
    link: 'https://facebook.quasar.dev',
    target: '_blank',
  },
  {
    title: 'Quasar Awesome',
    caption: 'Community Quasar projects',
    icon: 'favorite',
    link: 'https://awesome.quasar.dev',
    target: '_blank',
  },
  {
    title: 'Datos del usuario',
    caption: 'Datos de la cuenta y el usuario',
    icon: 'manage_accounts',
    subElementos: [
      {
        title: 'Datos del usuario',
        caption: 'Datos de la cuenta y el usuario',
        icon: 'manage_accounts',
        subElementos: [
          {
            title: 'Mi Perfil',
            caption: 'Modificar y ver mi perfil',
            icon: 'manage_accounts',
            to: 'profile',
          },
        ],
      },
    ],
  },
];

const leftDrawerOpen = ref(false);

//const darkMode = ref(false);
//watch(darkMode, (value) => $q.dark.set(value));

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}
</script>
