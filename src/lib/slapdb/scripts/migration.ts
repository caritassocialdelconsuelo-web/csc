import { createClient } from '@supabase/supabase-js';
import prompts from 'prompts';
import * as dotenv from 'dotenv';
import { SlapDB } from '..';
import { globSync } from 'glob'; // Reemplazo para import.meta.glob
import path from 'path';
import { pathToFileURL } from 'url';

//Lee el .env para obtener las variables de entorno necesarias para la conexión a Supabase
dotenv.config();
//Prepara los valores para conectarse a Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Usamos la anon key para el login inicial
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  // 1. Preguntar credenciales en la terminal

  const entityFiles = globSync(['src/lib/sladb/*.ts', 'src/services/database/entities/*.ts']);

  for (const file of entityFiles) {
    // 1. Convertir ruta relativa a absoluta
    const absolutePath = path.resolve(file);

    // 2. Convertir ruta a URL válida (especialmente importante en Windows)
    const fileUrl = pathToFileURL(absolutePath).href;

    try {
      // 3. Importar dinámicamente el módulo
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const module = await import(fileUrl);
      console.log(`✅ Módulo importado exitosamente: ${file}`);
    } catch (error) {
      console.error(`❌ Error al importar el módulo ${file}:`, error);
    }
  }
  const response = await prompts([
    {
      type: 'text',
      name: 'email',
      message: 'Email del Administrador:',
      initial: 'admin@tuapp.com',
    },
    {
      type: 'password',
      name: 'password',
      message: 'Contraseña:',
    },
  ]);

  if (!response.email || !response.password) {
    console.log('❌ Login cancelado.');
    return;
  }

  // 2. Autenticarse en Supabase
  console.log('🔐 Autenticando...');

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: response.email,
    password: response.password,
  });

  if (authError) {
    console.error('❌ Error de autenticación:', authError.message);
    return;
  }

  console.log('✅ Sesión iniciada correctamente.');

  // 3. Ejecutar la sincronización de tablas

  console.log('🚀 Iniciando sincronización de SlapDb...');
  await SlapDB.migrate(supabase);

  // Cerrar sesión al terminar
  await supabase.auth.signOut();
  console.log('✨ Proceso finalizado.');
}

await run();
