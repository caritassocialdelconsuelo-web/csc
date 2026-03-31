<template>
  <q-card class="auth-card shadow-10">
    <q-card-section class="bg-primary text-white text-center q-pa-lg">
      <q-icon name="lock" size="48px" />
      <div class="text-h5 q-mt-md">Acceso al Sistema</div>
      <div class="text-subtitle2 opacity-80">Ingresa tus credenciales</div>
    </q-card-section>

    <q-card-section class="q-pa-xl">
      <q-form @submit="handleLogin" class="q-gutter-y-md">
        <q-input
          v-model="email"
          label="Correo Electrónico"
          type="email"
          outlined
          autofocus
          :rules="[(val) => !!val || 'El email es requerido']"
        >
          <template v-slot:prepend>
            <q-icon name="email" />
          </template>
        </q-input>

        <q-input
          v-model="password"
          label="Contraseña"
          :type="showPassword ? 'text' : 'password'"
          outlined
          :rules="[(val) => !!val || 'La contraseña es requerida']"
        >
          <template v-slot:prepend>
            <q-icon name="key" />
          </template>
          <template v-slot:append>
            <q-icon
              :name="showPassword ? 'visibility' : 'visibility_off'"
              class="cursor-pointer"
              @click="showPassword = !showPassword"
            />
          </template>
        </q-input>

        <div class="q-mt-lg">
          <q-btn
            label="Iniciar Sesión"
            type="submit"
            color="primary"
            class="full-width"
            size="lg"
            :loading="loading"
          />
        </div>
      </q-form>
    </q-card-section>

    <q-card-actions align="center" class="q-pb-lg">
      <q-btn
        flat
        no-caps
        color="primary"
        label="¿No tienes cuenta? Regístrate aquí"
        to="/auth/register"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useSupabase } from 'src/composables/useSupabase';
//import { useSession } from 'src/composables/useSession';
//import { startAllReplications } from 'src/services/database/replication';

const router = useRouter();
const { supabase } = useSupabase();
const $q = useQuasar();
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);

async function handleLogin() {
  loading.value = true;

  try {
    // 1. Autenticación con Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (error) throw error;

    if (data.user) {
      // 3. Iniciar replicación (Solo si estamos online)
      if (window.navigator.onLine) {
        // Nota: El servicio de replicación que definimos filtrará por userId
        //await startAllReplications(db, data.user.id);
      }

      $q.notify({
        type: 'positive',
        message: 'Bienvenido',
        position: 'top',
      });

      // 4. Redirigir al perfil
      await router.push('/profile');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error('Login Error:', err);
    $q.notify({
      type: 'negative',
      message: 'Error de acceso',
      caption: err.message || 'Credenciales incorrectas',
      position: 'top',
    });
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-card {
  width: 100%;
  max-width: 450px;
  border-radius: 16px;
}

.opacity-80 {
  opacity: 0.8;
}
</style>
