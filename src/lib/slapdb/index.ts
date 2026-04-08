import { SlapBaseEntityWithReplycation } from 'src/lib/slapdb/SlapBaseEntityWithReplycation';
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Dexie, { type Table } from 'dexie';
import { registerEntity } from './register';
import { type SlapBaseEntity } from './SlapBaseEntity';
import { isSubclass, type Metaclass } from '../utils';
import {
  REALTIME_LISTEN_TYPES,
  REALTIME_SUBSCRIBE_STATES,
  type RealtimeChannel,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { type IRealtimeSynchronize } from './SlapTypes';
import { forceSession, useSession } from 'src/composables/useSession';
import type { EGrupo } from 'src/services/database/entities/EGrupo';
import type { EMenu } from 'src/services/database/entities/EMenu';
//import { myConfiguration } from 'src/composables/useGlobalConfiguration';
//import { forceSession, useSession } from 'src/composables/useSession';

//**********************Clase de base de datos generica
export class SlapDB extends Dexie implements IRealtimeSynchronize {
  [key: string]: any; //Define un diccionario dinámico para la clase
  public static entities: {
    [key: string]: {
      baseClass: Metaclass<typeof SlapBaseEntity>;
      localTableName: string;
      syncronizing: boolean;
    };
  } = {}; //Diccionario para almacenar las entidades registradas y sus nombres de tabla locales
  private static channel: RealtimeChannel;
  static registerEntity(classEntity: Metaclass<typeof SlapBaseEntity>, localTableName: string) {
    this.entities[classEntity._composeConfiguration.schemaInfo.entityName || localTableName] = {
      baseClass: classEntity,
      localTableName,
      syncronizing: false,
    };
    console.log(
      `SlapDB.registerEntity--->PreRegistrando la clase de la entidad ${classEntity._composeConfiguration.schemaInfo.entityName} en la tabla: ${localTableName} de Dexie`,
    );
  }
  static async migrate(supabase: SupabaseClient<any, 'public', 'public', any, any>) {
    // Aquí puedes implementar la lógica para migrar tus tablas, por ejemplo:
    // - Crear nuevas tablas si no existen
    // - Modificar la estructura de las tablas existentes
    // - Sincronizar datos entre tablas si es necesario
    // - Esto ocurre antes de crear la base de datos, por lo que puedes usar SQL o cualquier otro método para preparar el entorno
    console.log('SlapDB.migrate--->Ejecutando migración de tablas...');
    const syncTables = Object.entries(this.entities).filter(
      ([entityName, { baseClass, localTableName }]) =>
        baseClass && baseClass.prototype instanceof SlapBaseEntityWithReplycation, //busca solo las clases que replican
    );
    for (const [entityName, { baseClass, localTableName }] of syncTables) {
      console.log(
        `  - Preparando migración para la entidad: ${entityName} en la tabla: ${localTableName} en la tabla remota ${(<typeof SlapBaseEntityWithReplycation>baseClass).syncTableName}`,
      );
      if ('sqlCode' in baseClass.prototype) {
        console.log(`  - Ejecutando SQL personalizado para ${entityName}...`);
        console.log(`  - SQL a ejecutar: ${baseClass.prototype.sqlCode}`);
        const { data, error } = await supabase.rpc('admin_execute_dynamic_sql', {
          p_sql_query: baseClass.prototype.sqlCode,
        });
        if (error) {
          console.error(
            `  - ❌ Error al ejecutar SQL personalizado para la entidad: ${entityName} en la tabla: ${localTableName} en la tabla remota ${(<typeof SlapBaseEntityWithReplycation>baseClass).syncTableName}:`,
            error.message,
          );
        } else {
          console.log(
            `  - ✅ SQL personalizado ejecutado para la entidad: ${entityName} en la tabla: ${localTableName} en la tabla remota ${(<typeof SlapBaseEntityWithReplycation>baseClass).syncTableName}.`,
          );
        }
      } else {
        console.log(`  - Ejecutando creación de tabla standard para ${entityName}`);
        const syncTableName = (<typeof SlapBaseEntityWithReplycation>baseClass)
          ._composeConfiguration.dbstate.syncTableName;
        // La llamada rpc llevará el token JWT del usuario logueado automáticamente

        const { data, error } = await supabase.rpc('admin_provision_slap_table', {
          p_table_name: syncTableName,
        });

        if (error) {
          console.error(
            `  - ❌ Error en ${localTableName} de la tabla remota ${syncTableName}:`,
            error.message,
          );
        } else {
          console.log(
            `  - ✅ Tabla ${localTableName} de la tabla remota ${syncTableName} migrada.`,
          );
        }
      }
    }
    console.log('SlapDB.migrate--->Migración de tablas completada.');
  }

  get staticSelf() {
    // Retorna el constructor de la instancia actual tipado correctamente
    return this.constructor as typeof SlapDB;
  }
  _supabase!: SupabaseClient;
  constructor(
    dbName: string,
    version: number = 1,
    supabase: SupabaseClient,
    withAutoSyncronize = true,
  ) {
    super(dbName);
    try {
      this._supabase = supabase;
      //this.version(version).stores({});
      //Registra todas las clases que se han definido.
      const entities = this.staticSelf.entities;
      const tablesReg: { [key: string]: any } = { _sync_meta: 'id,checkpoint,tid' };
      for (const key of Object.keys(entities)) {
        tablesReg[key] = entities[key]?.baseClass.schema;
      }

      //Registra la tabla local de control de sincronización
      this.version(this.verno || 1).stores(tablesReg);

      Object.keys(entities).forEach((key) => {
        if (entities[key]) {
          //Que tenga una clase
          this.registerOneEntity(entities[key]);
        }
      });
      void this.test();
      if (import.meta.env.VITE_STARTUPDATA === '1') {
        void this.startUpData();
      }
    } catch (error) {
      console.log('Error en el constructor de SlapDB:', error);
    }
  }

  // Método extendido para incluir el mapeo
  registerOneEntity({
    baseClass,
    localTableName,
  }: {
    baseClass: Metaclass<typeof SlapBaseEntity>;
    localTableName: string;
  }) {
    try {
      if (
        baseClass._configuration.dbstate.registrable &&
        !baseClass._configuration.dbstate.registered
      ) {
        baseClass._configuration.dbstate.registered = true; //Indicamos que esta clase ya se ha registrado en la base de datos
        registerEntity(baseClass, this);
      } else {
        console.log(
          `La clase de la entidad ${baseClass._composeConfiguration.schemaInfo.entityName} ya ha sido registrada o no es registrable. (registerOneEntity)`,
        );
      }
    } catch (error) {
      console.log('Error en SlapDB.registerEntity:', error);
    }
  }
  mapToServerFormat<T extends SlapBaseEntity>(
    item: Partial<T>,
    synClass: SlapBaseEntityWithReplycation,
  ) {
    return synClass.getStaticObjectData(item, true);
  }

  //---------------Sync genérico para tablas replicables
  async syncTable(
    supabase: SupabaseClient<any, any, 'public', any, any>,
    synClass: SlapBaseEntityWithReplycation,
    batchSize: number = import.meta.env.VITE_SUPABASE_SYNCHRO_BATCH || 20,
  ) {
    const entityName = synClass._composeConfiguration.schemaInfo.entityName;
    if (
      this.staticSelf.entities[entityName] &&
      !this.staticSelf.entities[entityName].syncronizing
    ) {
      try {
        this.staticSelf.entities[entityName].syncronizing = true;
        if (synClass && isSubclass(synClass, SlapBaseEntityWithReplycation)) {
          const entityKeyColumn =
            ((synClass._composeConfiguration.schemaInfo.keyColumns?.length ?? 0) > 0
              ? synClass._composeConfiguration.schemaInfo.keyColumns?.[0]
              : 'id') ?? 'id'; //Obtenemos la columna clave de la entidad, por defecto 'id'

          const syncTableName = synClass._composeConfiguration.dbstate.syncTableName; //Obtenemos el nombre de la tabla remota desde la clase
          const localTableName = this.staticSelf.entities[entityName]?.localTableName ?? ''; //Obtenemos el nombre de la tabla local desde el registro de entidades
          const syncMeta = await this.table('_sync_meta').get(localTableName);
          const lastCp = syncMeta?.checkpoint || 0;

          // 1. Obtener registros sucios (created, updated, deleted)
          const dirtyItems = (
            await this.table(localTableName)
              .orderBy('updatedAt') //Ordenamos por fecha para enviar primero los cambios más antiguos
              .filter(
                (item) =>
                  !item.synchronized && ['created', 'updated', 'deleted'].includes(item.status),
              )
              .limit(batchSize)
              .toArray()
          ).map((item) => this.mapToServerFormat(item, synClass));

          // 2. Ejecuta en el servidor
          const { data, error } = await supabase.rpc('sync_table_data', {
            p_tablename: syncTableName,
            p_data: dirtyItems,
            p_last_checkpoint: lastCp,
            p_force_update: false,
          });

          //3.Si hay errores
          if (error) throw error;

          //4.actualiza los datos que vienen del servidor.
          await this.transaction(
            'rw',
            [this.table(localTableName), this.table('_sync_meta')],
            async (tx) => {
              (tx as unknown as any).additionalData = {
                syncTableName,
                syncClass: synClass,
                newCheckPoint: data.new_checkpoint,
                synchronizating: true,
              };
              // 4.1. Aplicar cambios remotos (PULL) - Operación Masiva
              if (data.changes && data.changes.length > 0) {
                const changesToPut = data.changes.map((remoteChange: any) => ({
                  ...remoteChange,
                  synchronized: true,
                }));

                // bulkPut es mucho más robusto que un bucle con put individual
                await tx.table(localTableName).bulkPut(changesToPut);
              }

              // 5. Confirmación de subida (PUSH)
              const successIds = dirtyItems
                .filter(
                  (item) => !data.errors.some((e: { pk: any }) => e.pk == item[entityKeyColumn]),
                ) // Corregido el acceso a item
                .map((item: any) => item[entityKeyColumn]);

              if (successIds.length > 0) {
                // USAR EL NOMBRE REAL DE LA COLUMNA (entityKeyColumn) en lugar de ':id'
                await tx.table(localTableName).where(entityKeyColumn).anyOf(successIds).modify({
                  synchronized: true,
                  lastCheckPoint: data.new_checkpoint,
                });
              }

              // 6. Actualizar checkpoint global
              await tx.table('_sync_meta').put({
                id: localTableName,
                checkpoint: data.new_checkpoint,
                tid: data.iod,
              });
            },
          );
          return data.errors;
        }
      } catch (error) {
        console.log('Error en syncTable', error);
      } finally {
        this.staticSelf.entities[entityName].syncronizing = false;
      }
    } else {
      //Reintenta hasta que la actual sincronización de tabla termina....
      setTimeout(
        () => {
          void this.syncTable(supabase, synClass, batchSize);
        },
        import.meta.env.VITE_SUPABASE_IMMEDIATE_MS || 300,
      );
    }
  }

  async runFullSync() {
    // Verificamos si realmente hay red antes de intentar
    if (!navigator.onLine) {
      console.warn('⚠️ No hay conexión a internet. No se puede sincronizar.');
      return;
    }

    console.log('🔄 SlapDb: Iniciando sincronización total...');

    const synClasses = Object.values(this.staticSelf.entities)
      .map(({ baseClass }) => baseClass)
      .filter((baseClass) => isSubclass(baseClass, SlapBaseEntityWithReplycation));

    for (const synClass of synClasses) {
      try {
        const errors = await this.syncTable(this._supabase, synClass as any);

        if (errors && errors.length > 0) {
          console.warn(
            `⚠️ Conflictos sincronizando en la entidad ${synClass._composeConfiguration.schemaInfo.entityName}:`,
            errors,
          );
        }
      } catch (error) {
        console.error(
          `❌ Error sincronizando tabla de la entidad ${synClass._composeConfiguration.schemaInfo.entityName}:`,
          error,
        );
      }
    }

    // Reintenta la sincronización después de un tiempo
    setTimeout(
      () => {
        void this.runFullSync();
      },
      import.meta.env.VITE_SUPABASE_MS_RETRY || 1000,
    );
  }

  async realtimeSyncSetup() {
    if (this.staticSelf.channel) {
      console.log(
        '⚠️ Realtime ya está configurado para esta base de datos. Evitando configuración duplicada.',
      );
      await this._supabase.removeChannel(this.staticSelf.channel);
    }
    this.staticSelf.channel = this._supabase.channel(`slbSync`, {
      config: {
        broadcast: {
          self: true, // <--- ESTO permite que el emisor reciba su propio mensaje
        },
      },
    });
    console.log(`🔔 Configurando Realtime para toda la base de datos`);
    this.staticSelf.channel
      .on(
        REALTIME_LISTEN_TYPES.BROADCAST,
        {
          event: '*',
        },
        (payload) => {
          // Si recibimos un cambio y no somos nosotros (basado en el checkpoint)
          void this.realtimeHandle(payload); //Ejecutamos la promesa sin esperar su resultado para no bloquear el hilo de eventos
        },
      )
      .subscribe((status) => {
        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          console.log(`✅ Conectado a Realtime para toda la base de datos`);
          // Al conectar o reconectar el socket, disparamos sync para recuperar lo perdido en el downtime
          void this.runFullSync(); //Ejecutamos la promesa sin esperar su resultado para no bloquear el hilo de eventos
        }

        if (status === REALTIME_SUBSCRIBE_STATES.CLOSED) {
          console.warn('⚠️ Conexión con Supabase perdida.');
        }
      });
  }

  async realtimeHandle(payload: unknown) {
    const t = (payload as any).payload.t;
    const c = (payload as any).payload.c;
    const table_data = (this._sync_meta as Table).where('tid').equals(t);
    // Aquí puedes implementar la lógica para manejar los cambios en tiempo real, por ejemplo:
    const primerRegistro = await table_data.first();
    if (c > primerRegistro?.checkpoint) {
      //syncronizamos sólo aquellas tablas que son avisadas de un checkpoint mayor. Esto evita sincronizaciones innecesarias y mejora el rendimiento.
      await this.syncTable(
        this._supabase,
        this.staticSelf.entities[primerRegistro.id]
          ?.baseClass as unknown as SlapBaseEntityWithReplycation,
      );
    }
  }

  async handleOnline() {
    await this.runFullSync();
    await this.realtimeSyncSetup();
  }
  handleOffline() {
    console.warn('⚠️ Sin conexión a internet. Trabajando en modo local.');
  }
  async startUpData() {
    await forceSession();
    const userId = useSession().session.value?.user.id;
    if (import.meta.env.VITE_STARTUPGRUPO === '1') {
      if (this.staticSelf.entities.Grupo) {
        const grupoUsuario: EGrupo =
          new this.staticSelf.entities.Grupo.baseClass() as unknown as EGrupo;
        grupoUsuario.nombre = 'Usuarios';
        await grupoUsuario.save();
        const grupoSocial: EGrupo =
          new this.staticSelf.entities.Grupo.baseClass() as unknown as EGrupo;
        grupoSocial.nombre = 'Caritas Social';
        await grupoSocial.save();
        const grupoCaritas: EGrupo =
          new this.staticSelf.entities.Grupo.baseClass() as unknown as EGrupo;
        grupoCaritas.nombre = 'Caritas';
        await grupoCaritas.save();
        const grupoAdmin: EGrupo =
          new this.staticSelf.entities.Grupo.baseClass() as unknown as EGrupo;
        grupoAdmin.nombre = 'Administradores';
        await grupoAdmin.save();
        const grupoRopa: EGrupo =
          new this.staticSelf.entities.Grupo.baseClass() as unknown as EGrupo;
        grupoRopa.nombre = 'Ropa';
        await grupoRopa.save();
        const grupoEntrevistadores: EGrupo =
          new this.staticSelf.entities.Grupo.baseClass() as unknown as EGrupo;
        grupoEntrevistadores.nombre = 'Entrevistadores';
        await grupoEntrevistadores.save();
        const grupoNocheC: EGrupo =
          new this.staticSelf.entities.Grupo.baseClass() as unknown as EGrupo;
        grupoNocheC.nombre = 'Noche de la Caridad';
        await grupoNocheC.save();
        const grupoFeria: EGrupo =
          new this.staticSelf.entities.Grupo.baseClass() as unknown as EGrupo;
        grupoFeria.nombre = 'Feria Americana';
        await grupoFeria.save();
        const grupoSecretaria: EGrupo =
          new this.staticSelf.entities.Grupo.baseClass() as unknown as EGrupo;
        grupoSecretaria.nombre = 'Secretaría';
        await grupoSecretaria.save();
      }
    }
    if (import.meta.env.VITE_STARTUPMENU === '1') {
      if (this.staticSelf.entities.Menu && this.staticSelf.entities.Grupo) {
        //Menus general usuarios
        const grupoUsuarios = await this.staticSelf.entities.Grupo.baseClass
          .where('nombre')
          ?.equals('Usuarios')
          .first();
        const menuUsuarios: EMenu = new this.staticSelf.entities.Menu.baseClass() as EMenu;
        menuUsuarios
          .assignData({
            title: 'Cuenta del Usuario',
            caption: 'Administre su cuenta de su usuario',
            icon: 'manage_accounts',
          })
          .grupos.create().grupo = grupoUsuarios;
        await menuUsuarios.save();
        //Menus Perfiles de usuario
        const menuProfile: EMenu = new this.staticSelf.entities.Menu.baseClass() as EMenu;
        menuProfile
          .assignData({
            title: 'Perfil',
            caption: 'Ver y editar su Perfil',
            icon: 'account_box',
            to: 'profile',
            menuMadre: menuUsuarios.id || '',
          })
          .grupos.create().grupo = grupoUsuarios;
        await menuProfile.save();
      }
    }
    if (import.meta.env.VITE_STARTUPGRUPOMENU === '1') {
    }
  }
  async test() {
    /*  await forceSession();
      const userId = useSession().session.value?.user.id;
      if (this.staticSelf.entities.Grupo && this.staticSelf.entities.UsuarioGrupo) {
        const grupo:EGrupo = (new this.staticSelf.entities.Grupo.baseClass()) as unknown as EGrupo;
        grupo.nombre = 'Grupo 2';
        (await grupo.usuarios[0]?.perfil).value.
        const usuario = grupo.usuarios.create();
        usuario.perfil = userId;
        //   // usuario.perfil = myConfiguration.configuration.value.supabase.session?.user.id;
        await grupo.save();
        //  grupo.nombre = 'Grupo 1';
        //  await grupo.save();
        const usuarioGrupo = new this.staticSelf.entities.UsuarioGrupo.baseClass();
        usuarioGrupo.grupo = grupo;
        usuarioGrupo.perfil = userId;
        await usuarioGrupo.save();
        console.log('Grupo:', (await usuarioGrupo.grupo).value);
        console.log('Perfil:', (await usuarioGrupo.perfil).value);
        console.log('Los usuarios ahora son:', grupo.usuarios);
      }
      //console.log('Pasando por el testo de SlapDb');
      //console.log(await this.table('Perfil').get('f08c6f80-f87d-41b6-b62e-1d4ada9699bb'));*/
  }
}

//CallBackFunction para crear la base de datos, se le pasa a useDatabase
export const createSlapDBCallBack = (config: { [key: string]: any }) => {
  if (!config.name) {
    console.log('El nombre de la base de datos es obligatorio (createSlapDBCallBack)');
    return null;
  } else {
    return new SlapDB(
      config.name,
      config.version || 1,
      config.supabase,
      config.withAutoSyncronize || true,
    );
  }
};
