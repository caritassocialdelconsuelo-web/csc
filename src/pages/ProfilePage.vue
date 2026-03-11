<template>
  <q-page class="q-pa-md flex flex-center">
    <div v-if="loadingInitial" class="text-center">
      <q-spinner-dots color="primary" size="40px" />
      <p>Cargando perfil local...</p>
    </div>

    <q-card v-else class="column shadow-2" style="width: 100%; max-width: 600px; border-radius: 12px">
      <q-card-section class="bg-primary text-white q-pa-lg">
        <div class="row items-center no-wrap">
          <q-avatar size="70px" font-size="32px" color="white" text-color="primary" icon="person" class="q-mr-md" />
          <div>
            <div class="text-h6">{{ formData.username }}</div>
            <div class="text-subtitle2 opacity-80">{{ formData.email }}</div>
          </div>
        </div>
      </q-card-section>

      <q-card-section class="q-pa-lg">
        <q-form @submit="saveProfile" class="q-gutter-y-md">
          <div class="text-overline text-grey-7 shadow-bottom q-mb-sm">Datos Personales</div>

          <div class="row q-col-gutter-md">
            <q-input v-model="formData.primerNombre" label="Primer Nombre" outlined class="col-12 col-sm-6"
              :rules="[(val) => !!val || 'El nombre es requerido']" />
            <q-input v-model="formData.apellido" label="Apellido" outlined class="col-12 col-sm-6"
              :rules="[(val) => !!val || 'El apellido es requerido']" />
          </div>

          <div class="text-overline text-grey-7 q-mt-lg">Preferencias de la Aplicación</div>

          <div class="row q-col-gutter-md">
            <q-select v-model="formData.idioma" :options="IDIOMA_OPTIONS" label="Idioma" outlined emit-value map-options
              class="col-12 col-sm-6" options-dense />
            <q-select v-model="formData.tema" :options="TEMA_OPTIONS" label="Tema Visual" outlined emit-value
              map-options class="col-12 col-sm-6" options-dense />
          </div>

          <q-separator class="q-my-lg" />

          <div class="row justify-between items-center">
            <div class="text-caption text-grey">
              Estado de cuenta:
              <q-badge :color="statusColor" label-color="white" :label="formData.estado" />
            </div>

            <q-btn label="Guardar Cambios" type="submit" color="primary" :loading="saving" icon="save"
              padding="sm lg" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted, computed } from 'vue';
  import { useQuasar } from 'quasar';

  import { useDatabase } from '../composables/useDb';
  import { useSupabase } from '../composables/useSupabase';
  import { createSlapDBCallBack } from 'src/lib/slapdb';
  import { EPerfil } from 'src/services/database/schemas/perfil';

  const { supabase: { value: supabase } } = useSupabase();

  // CONSTANTES
  const IDIOMA_OPTIONS = [
    { label: 'Español', value: 'es' },
    { label: 'English', value: 'en' },
  ];

  const TEMA_OPTIONS = [
    { label: 'Sistema', value: 'system' },
    { label: 'Claro', value: 'light' },
    { label: 'Oscuro', value: 'dark' },
  ];

  // ESTADO REACTIVO
  const $q = useQuasar();
  const {
    db: { value: db },
  } = useDatabase({}, createSlapDBCallBack);
  const docPerfil = ref<EPerfil | null>(null);
  const formData = ref<Partial<EPerfil>>({});
  const loadingInitial = ref(true);
  const saving = ref(false);

  // COMPUTED
  const statusColor = computed(() => {
    switch (formData.value.estado) {
      case 'activo':
        return 'positive';
      case 'suspendido':
        return 'negative';
      case 'inactivo':
        return 'negative';
      default:
        return 'warning';
    }
  });

  /**
   * Carga inicial y suscripción reactiva
   */
  onMounted(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !db) {
        $q.notify({ type: 'negative', message: 'No se detectó sesión activa' });
        return;
      }

      docPerfil.value = await EPerfil.get(user.id);
      formData.value = docPerfil.value?.getObjectData();
      loadingInitial.value = false;
    } catch (error) {
      console.error('Error en ProfilePage:', error);
    }
  });

  /**
   * Limpieza al salir de la página
   */
  onUnmounted(() => { });

  /**
   * Persistencia Offline-First
   */
  async function saveProfile() {
    if (!docPerfil.value) return;

    saving.value = true;
    try {
      docPerfil.value.patch({
        primerNombre: formData.value.primerNombre || '',
        apellido: formData.value.apellido || '',
        idioma: formData.value.idioma || '',
        tema: formData.value.tema || 'system',
      });
      await docPerfil.value.save();
      $q.notify({
        type: 'positive',
        message: 'Cambios guardados localmente',
        caption: 'Se sincronizará con el servidor automáticamente.',
        timeout: 2000,
      });
    } catch (err) {
      console.error('Error al parchear documento:', err);
      $q.notify({ type: 'negative', message: 'Error al actualizar perfil' });
    } finally {
      saving.value = false;
    }
  }
</script>

<style scoped>
.opacity-80 {
  opacity: 0.8;
}

.shadow-bottom {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}
</style>
