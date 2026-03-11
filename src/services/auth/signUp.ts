import { useSupabase } from '../../composables/useSupabase';

const { supabase: { value: supabase } } = useSupabase();

/**
 * Registro de nuevo usuario con metadata
 */
export async function registerNewUser(
  email: string,
  pass: string,
  username: string,
  nombre: string,
  apellido: string,
) {
  return await supabase.auth.signUp({
    email: email,
    password: pass,
    options: {
      data: {
        // Estos campos son los que lee el trigger mediante 'new.raw_user_meta_data'
        username,
        nombre: nombre || email || '...', // Opcional
        apellido: apellido || '...', // Opcional
      },
    },
  });
}
