# Rol: Tu eres un programador experto especializado en:

1.  TypeScript
2.  En framework Quasar/vue3 js
3.  En postgress
4.  En desarrollo de aplicaciones PWA
5.  En Supabase
6.  En el uso de la libreria RxDB Version 14
7.  En el plugin de replicación de rxdb-supabase ver **https://github.com/marceljuenemann/rxdb-supabase/blob/main/README.md** como referencia
8.  Todo el código que me sugieres debe estar comprobado y si no lo está advierteme para que lo revise especificamente.
9.  Tiene conocimiento teoricos sobre ORM lo cual te permite trabajar con clases tipo y objetos.

# Contexto:

1.  La aplicación en Quasar ya esta creada y los componentes están instalados.
2.  Por problemas técnicos se ha usado el plugin par areplicar en supabase de forma que se ha incorporado su codigo y tipos directamente al proyecto y no a través de npm para corregirlo y llevarlo a las version actuales para que funcine, pero sin diferencias en su lógica de funcionamiento.
3.  Vamos a empezar un proyecto en supabase, esto es muy importante que lo tengas siempre presente.
4.  Puro codigo TypeScript.
    4.a) Variables: siempre camelCase
    4.b) Clases/Componentes: siempre PascalCase
    4.c) Constantes: siempre UPPER_SNAKE_CASE.
    Objetivo:
5.  Ya tenemos el backen en supabase contruido con el siguiente codigo SQL.

//PRINCIPIO DE SQL DE TPERFIL EN SUPABASE

```SQL
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
    "_modified" TIMESTAMPTZ DEFAULT now(),
    "_deleted" BOOLEAN DEFAULT FALSE
);

-- Índices
CREATE INDEX IF NOT EXISTS "idx_tperfil_email" ON public."TPerfil" ("email");
CREATE INDEX IF NOT EXISTS "idx_tperfil_username" ON public."TPerfil" ("username");
CREATE INDEX IF NOT EXISTS "idx_tperfil_modified" ON public."TPerfil" ("_modified");

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

//FIN DE SQL DE TPERFIL EN SUPABASE
```

6. Y tenemos la entidad para Rxdb...

```TypeScript
//Declaración de la entidad Perfil
import type { RxCollection, RxDocument, RxJsonSchema } from 'rxdb';
import { toTypedRxJsonSchema, type ExtractDocumentTypeFromTypedRxJsonSchema } from 'rxdb';

export const slPerfil = {
  title: 'Perfil Entity ',
  description: 'Entidad Perfil',
  version: 0,
  keyCompression: true,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    username: {
      type: 'string',
      minLength: 3,
      maxLength: 120,
    },
    email: {
      type: 'string',
      format: 'email',
    },
    estado: {
      type: 'string',
      enum: ['active', 'inactive', 'suspended'],
    },
    primerNombre: {
      type: 'string',
    },
    apellido: {
      type: 'string',
    },
    avatarUrl: {
      type: 'string',
    },
    cumpleanios: {
      type: 'string',
    },
    idioma: {
      type: 'string',
      maxLength: 2,
    },
    tema: {
      type: 'string',
      enum: ['light', 'dark', 'system'],
    },
    fechaCreacion: {
      type: 'string',
    },
    ultimoLogin: {
      type: 'string',
    },
    _modified: {
      type: 'string',
    },
    _deleted: {
      type: 'boolean',
    },
  },
  required: ['id', 'username', 'email', 'estado', 'primerNombre', 'apellido'], // Apellido añadido
  indexes: ['username', 'email', '_modified'],
} as const;

// eslint-disable-next-line
const STPerfil = toTypedRxJsonSchema(slPerfil);

// aggregate the document type from the schema
export type DTPerfil = ExtractDocumentTypeFromTypedRxJsonSchema<typeof STPerfil>;

// create the typed RxJsonSchema from the literal typed object.
export const jsPerfil: RxJsonSchema<DTPerfil> = slPerfil;

export type DMPerfil = {
  getFullName(): string;
};

export const dmPerfil: DMPerfil = {
  getFullName: function (this: DRxPerfil) {
    return `${this.primerNombre} ${this.apellido}`.trim();
  },
};

export type DRxPerfil = RxDocument<DTPerfil, DMPerfil>;

// we declare one static ORM-method for the collection
export type CMPerfil = {
  findByUsername(username: string): Promise<DRxPerfil | null>;
};

export const cmPerfil: CMPerfil = {
  findByUsername: async function (this: CTPerfil, username: string) {
    return await this.findOne({
      selector: { username },
    }).exec();
  },
};

// and then merge all our types
export type CTPerfil = RxCollection<DTPerfil, DMPerfil, CMPerfil>;

export function postInsertPerfilHook(this: CTPerfil, docData: DTPerfil, doc: DRxPerfil) {
  console.log('insert to ' + this.name + '-collection: ' + doc.id);
}

export function postCreatePerfilHook(this: CTPerfil, docData: DTPerfil, doc: DRxPerfil) {
  console.log('create to ' + this.name + '-collection: ' + doc.id);
}

export function postRemovePerfilHook(this: CTPerfil, docData: DTPerfil, doc: DRxPerfil) {
  console.log('Remove to ' + this.name + '-collection: ' + doc.id);
}

export function postSavePerfilHook(this: CTPerfil, docData: DTPerfil, doc: DRxPerfil) {
  console.log('Save to ' + this.name + '-collection: ' + doc.id);
}

export function preInsertPerfilHook(docData: DTPerfil, instance: RxCollection<DTPerfil, DMPerfil>) {
  console.log('Pre Insert to ' + instance.name + '-collection: ' + docData.id);
}

export function preRemovePerfilHook(this: CTPerfil, docData: DTPerfil, doc: DRxPerfil) {
  console.log('Pre Remove to ' + this.name + '-collection: ' + doc.id);
}

export function preSavePerfilHook(this: CTPerfil, docData: DTPerfil, doc: DRxPerfil) {
  console.log('Pre Save to ' + this.name + '-collection: ' + doc.id);
}

export function registerPerfilHooks(objPerfilColl: CTPerfil) {
  objPerfilColl.postInsert(postInsertPerfilHook, false);
  objPerfilColl.postCreate(postCreatePerfilHook);
  objPerfilColl.postRemove(postRemovePerfilHook, false);
  objPerfilColl.postSave(postSavePerfilHook, false);
  objPerfilColl.preInsert(preInsertPerfilHook, false);
  objPerfilColl.preRemove(preRemovePerfilHook, false);
  objPerfilColl.preSave(preSavePerfilHook, false);
}
```

# OBJETIVO:

1. Que archivo debo tocar en Quasar.
   1. Para que me indique si debo ir a registrarme como usuario nuevo sugerirme una path.
   2. Page completa de registración.
   3. Page completa de login para el caso que se desconecte.
   4. Como debe quasar darse cuenta que estoy offline y no pedir login.
   5. También necesito el mecanismo por el cual el usuario puede actualizar su perfil, una vez logueado y como eso se sincroniza cuando está en linea.
   6. Al hcer la resincronización necesito conocer exactamente donde debo poner el código y que código es el que necesito para comenzar la resincronización de TPerfil y de otras tablas.
2. Se claro con los nombres de los archivos y los lugares donde debo incluirlos en mi proyecto quasar. Explica brevemente comentando en el codigo, el nombre de archivo sugerido y porque.
