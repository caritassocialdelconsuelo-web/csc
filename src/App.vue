<template>
  <router-view />
</template>

<script setup lang="ts">
//
import { useNetworkSync } from 'src/composables/useNetworkSync';
useNetworkSync();
</script>
