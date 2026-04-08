<template>
  <q-expansion-item
    v-if="subElementos && subElementos?.length > 0"
    :label="title"
    expand-separator
    :icon="icon"
    :caption="caption"
    :header-inset-level="level"
  >
    <EssentialLink
      v-for="link in subElementos"
      :key="link.title"
      v-bind="link"
      :level="level + 0.3"
    />
  </q-expansion-item>
  <q-item
    v-else
    clickable
    tag="a"
    :href="link"
    :to="to"
    :target="target"
    active-class="active-menu-style"
    :inset-level="level"
  >
    <q-item-section v-if="icon" avatar>
      <q-icon :name="icon" />
    </q-item-section>

    <q-item-section>
      <q-item-label>{{ title }}</q-item-label>
      <q-item-label caption>{{ caption }}</q-item-label>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
export interface EssentialLinkProps {
  title: string;
  caption?: string;
  link?: string;
  to?: string;
  icon?: string;
  target?: string;
  subElementos?: EssentialLinkProps[];
  level?: number;
}

withDefaults(defineProps<EssentialLinkProps>(), {
  caption: '',
  icon: '',
  target: '_self',
  level: 0,
});
</script>
