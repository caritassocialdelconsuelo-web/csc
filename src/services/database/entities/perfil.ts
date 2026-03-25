//Declaración de la entidad Perfil

import { useSession } from 'src/composables/useSession';
import { Column, Entity } from 'src/lib/slapdb/decorators';
import { SlapBaseEntityWithReplycation } from 'src/lib/slapdb/SlapBaseEntityWithReplycation';
import {
  ICustomGeneratorID,
  ICustomScriptCode,
  type TDataSlapEntity,
} from 'src/lib/slapdb/SlapTypes';

export type EstadoPerfil = 'activo' | 'inactivo' | 'suspendido';
export type TemaApp = 'light' | 'dark' | 'system';

// 1. Define los tipos literales explícitamente
@Entity('Perfil', 'TPerfil')
export class EPerfil
  extends SlapBaseEntityWithReplycation
  implements ICustomGeneratorID, ICustomScriptCode
{
  @Column('data', true)
  username: string = '';
  @Column('data', true)
  email: string = '';
  @Column('data', true)
  estado: EstadoPerfil = 'inactivo';
  @Column()
  nombre: string = '';
  @Column()
  apellido: string = '';
  @Column()
  avatarUrl: string = '';
  @Column()
  cumpleanios: Date = new Date();
  @Column()
  idioma: string = 'ES';
  @Column()
  tema: TemaApp = 'system';
  @Column()
  fechaCreacion: Date = new Date();
  @Column()
  ultimoLogin: Date = new Date();
  async generateId() {
    //implementación de la generación de ID personalizada
    try {
      const {
        session: { value: session },
      } = await useSession();
      if (session?.user?.id) {
        return session.user.id;
      } else {
        console.log(
          'No se pudo obtener el userId de la sesión en EPerfil: Sesión o userId no disponible',
        );
        return undefined;
      }
    } catch (error) {
      console.log(`Error al obtener el userId de la sesión en EPerfil:`, error);
      return undefined;
    }
  }
  get sqlCode(): string {
    return `
    -- 1. Función para actualizar la columna _modified (Consistente con comillas)
    CREATE OR REPLACE FUNCTION update_modified_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.metadata= jsonb_set(
        COALESCE(NEW.metadata, '{}'::jsonb),
        '{_modified}',
        to_jsonb(now()));
        RETURN NEW;
    END;
    $$ language 'plpgsql';
    -- 2.a Create SEQUENCE para generar IDs únicos (Si no existe)

    CREATE SEQUENCE IF NOT EXISTS public.seq_checkPoint_${this.staticSelf.syncTableName}
    START WITH 1;

    -- 2. Tabla ${this.staticSelf.syncTableName}
    CREATE TABLE IF NOT EXISTS public."${this.staticSelf.syncTableName}" (
        id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
        data JSONB,
        metadata JSONB,
        checkPoint BIGINT NOT NULL DEFAULT nextval('public.seq_checkPoint_${this.staticSelf.syncTableName}'),
        CONSTRAINT chk_estado CHECK ((data->>'estado') IN ('activo', 'inactivo', 'suspendido')),
        CONSTRAINT chk_username CHECK (char_length(data->>'username') >= 3)
    );

    -- Índices
    CREATE INDEX IF NOT EXISTS "idx_tperfil_email" ON public."${this.staticSelf.syncTableName}" ((data->>'email'));
    CREATE INDEX IF NOT EXISTS "idx_tperfil_username" ON public."${this.staticSelf.syncTableName}" ((data->>'username'));
    CREATE INDEX IF NOT EXISTS "idx_tperfil_checkPoint" ON public."${this.staticSelf.syncTableName}" (checkPoint);

    -- 3. Habilitar RLS (Seguridad corregida)
    ALTER TABLE public."${this.staticSelf.syncTableName}" ENABLE ROW LEVEL SECURITY;

    -- 4. Política de Acceso (Corregida)

    DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON public."${this.staticSelf.syncTableName}";
    CREATE POLICY "Usuarios pueden ver su propio perfil"
      ON public."${this.staticSelf.syncTableName}" FOR SELECT
        USING ((select auth.uid()) = id);

    DROP POLICY IF EXISTS "Usuarios pueden modificar su propio perfil" ON public."${this.staticSelf.syncTableName}";
    CREATE POLICY "Usuarios pueden modificar su propio perfil"
      ON public."${this.staticSelf.syncTableName}" FOR update
        USING ((select auth.uid()) = id);
    -- Política para permitir el INSERT inicial del Upsert
    CREATE POLICY "Usuarios pueden insertar su propio perfil"
      ON public."${this.staticSelf.syncTableName}" FOR INSERT
      WITH CHECK (auth.uid() = "id");

    ALTER PUBLICATION supabase_realtime ADD TABLE "${this.staticSelf.syncTableName}";

    -- 5. Trigger para _modified
    -- Eliminamos primero por si estás re-ejecutando el script
    DROP TRIGGER IF EXISTS set_modified_tperfil ON public."${this.staticSelf.syncTableName}";
    CREATE TRIGGER set_modified_tperfil
      BEFORE UPDATE ON public."${this.staticSelf.syncTableName}"
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

      INSERT INTO public."${this.staticSelf.syncTableName}" (
          id,
          data,
          metadata,
          checkpoint
        )
        VALUES (
          new.id,
          jsonb_build_object(
            'username', initial_username,
            'email', new.email,
            'estado', 'inactivo',
            'nombre', COALESCE(new.raw_user_meta_data->>'nombre', '...'),
            'apellido', COALESCE(new.raw_user_meta_data->>'apellido', '...')),
          jsonb_build_object(
            'createdAt', now(),
            'updatedAt', now(),
            'deletedAt', null,
            'deleted', false
          ),
          nextval('public.seq_checkPoint_${this.staticSelf.syncTableName}') --Crea el proximo valor de sequencia para syncronizar
        );

      RETURN new;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- 7. Trigger de Auth
    DO $$
    BEGIN
      IF NOT EXISTS (
          SELECT 1
          FROM pg_trigger
          WHERE tgname = 'on_auth_user_created'
        ) THEN
          CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
      END IF;
    END;
    $$;
    -- YA NO ELIMINAMOS -- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    `;
  }
  get codeDescription(): string {
    return 'Función SQL para generar el ID de EPerfil basado en el user_id de la sesión actual';
  }

  constructor(data: TDataSlapEntity, fromDb: boolean) {
    super(data, fromDb);
  }
}
