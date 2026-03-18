<template>
  <router-view />
</template>

<script setup lang="ts">
import { useNetworkSync } from './composables/useNetworkSync';
// IMPORTANTE: No uses 'await' aquí afuera
useNetworkSync(); // Esto se encargará de preparar la base de datos y sincronizarla
</script>
