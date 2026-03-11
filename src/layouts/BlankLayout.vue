<template>
  <q-layout view="lHh Lpr lFf" class="bg-grey-1">
    <q-page-container>
      <q-page class="flex flex-center q-pa-md">
        <router-view v-slot="{ Component }">
          <transition
            appear
            enter-active-class="animated fadeIn"
            leave-active-class="animated fadeOut"
            mode="out-in"
          >
            <component :is="Component" />
          </transition>
        </router-view>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
// No requiere lógica adicional, es un contenedor puro.
</script>

<style scoped>
/* Opcional: Un degradado sutil de fondo para que no sea blanco puro */
.bg-grey-1 {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
}
</style>
