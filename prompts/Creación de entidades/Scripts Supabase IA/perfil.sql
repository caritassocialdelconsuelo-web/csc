-- 1. Función para el timestamp de RxDB
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW._modified = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Tabla TPerfil
CREATE TABLE IF NOT EXISTS public."TPerfil" (
    "id" UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    "username" TEXT UNIQUE NOT NULL CHECK (char_length("username") >= 3 AND char_length("username") <= 120),
    "email" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'inactivo' CHECK ("estado" IN ('activo', 'inactivo', 'suspendido')),
    "primerNombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "cumpleanios" DATE,
    "idioma" TEXT DEFAULT 'es' CHECK (char_length("idioma") = 2),
    "tema" TEXT DEFAULT 'system' CHECK ("tema" IN ('light', 'dark', 'system')),
    "fechaCreacion" TIMESTAMPTZ DEFAULT now(),
    "ultimoLogin" TIMESTAMPTZ,
    "actualizadoEn" TIMESTAMPTZ DEFAULT now(),
    "registroBorrado" BOOLEAN DEFAULT FALSE
);

-- Índices
CREATE INDEX IF NOT EXISTS "idx_tperfil_email" ON public."TPerfil" ("email");
CREATE INDEX IF NOT EXISTS "idx_tperfil_username" ON public."TPerfil" ("username");
CREATE INDEX IF NOT EXISTS "idx_tperfil_modified" ON public."TPerfil" ("actualizadoEn");

-- 3. Habilitar RLS (Seguridad corregida)
ALTER TABLE public."TPerfil" ENABLE ROW LEVEL SECURITY;

-- 4. Política de Acceso (Corregida)
-- Nota: "id" entre comillas porque así se definió en el CREATE TABLE
CREATE POLICY "Usuarios pueden ver su propio perfil" 
  ON public."TPerfil" FOR SELECT 
  USING ((select auth.uid()) = "id");

CREATE POLICY "Usuarios pueden modificar su propio perfil" 
  ON public."TPerfil" FOR update 
  USING ((select auth.uid()) = id);


-- 5. Trigger para _modified
-- Eliminamos primero por si estás re-ejecutando el script
DROP TRIGGER IF EXISTS set_modified_tperfil ON public."TPerfil";
CREATE TRIGGER set_modified_tperfil
BEFORE UPDATE ON public."TPerfil"
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- 6. Función Trigger para creación automática (Consistente con comillas)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  initial_username TEXT;
BEGIN
  initial_username := COALESCE(new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));    
  -- Aseguramos que cumpla con el mínimo de 3 caracteres del CHECK
  IF char_length(initial_username) < 3 THEN
    initial_username := initial_username || '_user';
  END IF;  

-- Truncamos a 120 para que no falle el INSERT si es muy largo
  initial_username := substring(initial_username from 1 for 120);  

INSERT INTO public."TPerfil" (
    "id", 
    "username", 
    "email", 
    "estado", 
    "primerNombre", 
    "apellido"
  )
  VALUES (
    new.id, 
    initial_username, 
    new.email, 
    'inactivo', 
    COALESCE(new.raw_user_meta_data->>'nombre', '...'), 
    COALESCE(new.raw_user_meta_data->>'apellido', '...')
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger de Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();