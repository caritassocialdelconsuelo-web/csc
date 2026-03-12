
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  Transaction,
  Observable as DexieObservable,
} from 'dexie';
import Dexie, { liveQuery, type Table } from 'dexie';
import { BehaviorSubject, debounceTime, distinctUntilChanged, from, switchMap, type Observable as RxObservable } from 'rxjs';
import { Column } from './decorators';
import { registerEntity } from './register';
import { type SlapBaseEntity } from './SlapBaseEntity';
import type { StaticOf } from '../utils';
import { type Metaclass } from '../utils';

//**********************Clase de base de datos generica
export class SlapDB extends Dexie {
  [key: string]: any; //Define un diccionario dinámico para la clase
  static entities: {
    [key: string]: {
      baseClass: Metaclass<typeof SlapBaseEntity>,
      localTableName: string
    }
  } = {}; //Diccionario para almacenar las entidades registradas y sus nombres de tabla locales

  static registerEntity(classEntity: Metaclass<typeof SlapBaseEntity>, localTableName: string) {
    this.entities[classEntity.name] = {
      baseClass: classEntity,
      localTableName
    };
    console.log(`SlapDB.registerEntity--->PreRegistrando la clase: ${classEntity.name} en la tabla: ${localTableName} de Dexie`);
  };

  get staticSelf() {
    // Retorna el constructor de la instancia actual tipado correctamente
    return this.constructor as typeof SlapDB;
  }

  constructor(dbName: string, version: number = 1) {
    super(dbName);
    try {
      this.version(version).stores({});
      //Registra todas las clases que se han definido.
      const entities = this.staticSelf.entities
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
  registerOneEntity({ baseClass, localTableName }: {
    baseClass: Metaclass<typeof SlapBaseEntity>,
    localTableName: string
  }) {
    try {
      const currentVersion = this.verno || 0;
      if (baseClass.registrable && !baseClass.registered) {
        baseClass.registered = true;//Indicamos que esta clase ya se ha registrado en la base de datos
        // Definimos el store
        this.version(currentVersion).stores({
          [localTableName]: baseClass.schema,
        });

        // Mapeamos la tabla a la clase
        // Esto hace que db[tableName] devuelva instancias de entityClass
        this[localTableName].mapToClass(baseClass);
        registerEntity(baseClass, this[localTableName] as Table<any, any>);
      } else {
        console.log(`La clase ${baseClass.name} ya ha sido registrada o no es registrable. (registerOneEntity)`);
      }
    } catch (error) {
      console.log('Error en SlapDB.registerEntity:', error);
    }
  }
}
//CallBackFunction para crear la base de datos, se le pasa a useDatabase
export const createSlapDBCallBack = (config: { [key: string]: any }) => {
  if (!config.name) {
    console.log('El nombre de la base de datos es obligatorio (createSlapDBCallBack)');
    return null;
  } else {
    return new SlapDB(config.name, config.version || 1);
  }
}


