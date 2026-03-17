import { SlapBaseEntityWithReplycation } from 'src/lib/slapdb/SlapBaseEntityWithReplycation';
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Dexie, { type Table } from 'dexie';
import { registerEntity } from './register';
import { type SlapBaseEntity } from './SlapBaseEntity';
import { isSubclass, type Metaclass } from '../utils';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sync } from 'glob/raw';

//**********************Clase de base de datos generica
export class SlapDB extends Dexie {
  [key: string]: any; //Define un diccionario dinámico para la clase
  public static entities: {
    [key: string]: {
      baseClass: Metaclass<typeof SlapBaseEntity>;
      localTableName: string;
    };
  } = {}; //Diccionario para almacenar las entidades registradas y sus nombres de tabla locales

  static registerEntity(classEntity: Metaclass<typeof SlapBaseEntity>, localTableName: string) {
    this.entities[classEntity.name] = {
      baseClass: classEntity,
      localTableName,
    };
    console.log(
      `SlapDB.registerEntity--->PreRegistrando la clase: ${classEntity.name} en la tabla: ${localTableName} de Dexie`,
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
        const syncTableName = (<typeof SlapBaseEntityWithReplycation>baseClass).syncTableName;
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

  constructor(dbName: string, version: number = 1, withAutoSyncronize = true) {
    super(dbName);
    try {
      this.version(version).stores({});
      //Registra todas las clases que se han definido.
      const entities = this.staticSelf.entities;

      //Registra la tabla local de control de sincronización
      this.version(this.verno || 0).stores({
        ['_sync_meta']: 'id,checkpoint',
      });

      Object.keys(entities).forEach((key) => {
        if (entities[key]) {
          //Que tenga una clase
          this.registerOneEntity(entities[key]);
        }
      });
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
      const currentVersion = this.verno || 0;
      if (baseClass.registrable && !baseClass.registered) {
        baseClass.registered = true; //Indicamos que esta clase ya se ha registrado en la base de datos
        // Definimos el store
        this.version(currentVersion).stores({
          [localTableName]: baseClass.schema,
        });

        // Mapeamos la tabla a la clase
        // Esto hace que db[tableName] devuelva instancias de entityClass
        this[localTableName].mapToClass(baseClass);
        registerEntity(baseClass, this[localTableName] as Table<any, any>);
      } else {
        console.log(
          `La clase ${baseClass.name} ya ha sido registrada o no es registrable. (registerOneEntity)`,
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
    if (synClass && isSubclass(synClass, SlapBaseEntityWithReplycation)) {
      const entityKeyColumn =
        ((synClass._keyColumns?.length ?? 0) > 0 ? synClass._keyColumns?.[0] : 'id') ?? 'id'; //Obtenemos la columna clave de la entidad, por defecto 'id'

      const syncTableName = synClass.syncTableName; //Obtenemos el nombre de la tabla remota desde la clase
      const localTableName = this.staticSelf.entities[synClass.name]?.localTableName ?? ''; //Obtenemos el nombre de la tabla local desde el registro de entidades
      const syncMeta = await this.table('_sync_meta').get(localTableName);
      const lastCp = syncMeta?.checkpoint || 0;

      // 1. Obtener registros sucios (created, updated, deleted)
      const dirtyItems = (
        await this.table(localTableName)
          .orderBy('updatedAt') //Ordenamos por fecha para enviar primero los cambios más antiguos
          .filter(
            (item) => !item.synchronized && ['created', 'updated', 'deleted'].includes(item.status),
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
            .filter((item) => !data.errors.some((e: { pk: any }) => e.pk == item[entityKeyColumn])) // Corregido el acceso a item
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
          });
        },
      );
      return data.errors;
    }
  }
}
//CallBackFunction para crear la base de datos, se le pasa a useDatabase
export const createSlapDBCallBack = (config: { [key: string]: any }) => {
  if (!config.name) {
    console.log('El nombre de la base de datos es obligatorio (createSlapDBCallBack)');
    return null;
  } else {
    return new SlapDB(config.name, config.version || 1, config.withAutoSyncronize || true);
  }
};
