<template>
  <q-page class="flex flex-center">
    <q-card style="width: 400px">
      <q-card-section>
        <div class="text-h6">Registro de Usuario</div>
      </q-card-section>
      <q-form @submit="handleRegister">
        <q-card-section class="q-gutter-md">
          <q-input
            v-model="form.username"
            label="Username (mín 3 chars)"
            :rules="[(val) => !!val || 'Requerido']"
          />
          <q-input v-model="form.email" label="Email" type="email" />
          <q-input v-model="form.password" label="Password" type="password" />
          <q-input v-model="form.nombre" label="Primer Nombre" />
          <q-input v-model="form.apellido" label="Apellido" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Ir al Login" to="/login" />
          <q-btn label="Registrar" color="primary" type="submit" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
//import { useRouter } from 'vue-router';
import { registerNewUser } from 'src/services/auth/signUp';

const form = ref({
  username: '',
  email: '',
  password: '',
  nombre: '',
  apellido: '',
});

async function handleRegister() {
  const { error } = await registerNewUser(
    form.value.email,
    form.value.password,
    form.value.username,
    form.value.nombre,
    form.value.apellido,
  );
  if (error) alert(error.message);
  else alert('Verifica tu email. Luego espera a que un administrador active tu cuenta.');
}
</script>
