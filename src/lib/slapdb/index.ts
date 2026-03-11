
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  Transaction,
  Observable as DexieObservable,
} from 'dexie';
import Dexie, { liveQuery, type Table } from 'dexie';
import { BehaviorSubject, debounceTime, distinctUntilChanged, from, switchMap, type Observable as RxObservable } from 'rxjs';
import { isAsync } from '../utils';

const registeredEntitys: { [key: string]: typeof SlapBaseEntity } = {};

export function Entity<T extends new (...args: any[]) => any>(constructor: T) {
  const claseEntidadHija = class extends constructor {
    constructor(...args: any[]) {
      super(...args); // 1. Llama al constructor original (Madre + Hija)
      // 2. En este punto, los campos de la Hija ya se inicializaron.
      // Si el primer argumento es el objeto 'data', lo aplicamos ahora.
      const data = args[0];
      this.initializeMyData(data);
    }
  };

  registeredEntitys[constructor.name] = constructor as unknown as typeof SlapBaseEntity;
  console.log(`Se ha registrado la clase: ${constructor.name}`);
  return claseEntidadHija;
}





export function Column(target: any, key: string) {
  // Obtenemos o inicializamos la lista de columnas en el prototipo
  const MiClase = target.constructor as SlapBaseEntity;
  MiClase._columns.push(key);

  // Guardamos la lista en el constructor para que sea accesible
  //target.constructor._columns = columns;
}

//Clase base para todas las entidades con ID generado por UUID

export abstract class SlapBaseEntity {
  static _columns = [];
  static table: Table<any, any>;
  [key: string]: any; //Define un diccionario dinámico para la clase
  @Column
  id: string | null = null;

  static schema = 'id';

  //Constructor genérico
  constructor(data?: Partial<SlapBaseEntity>) {
    try {
      this.initializeMyData(data);
    } catch (error) {
      console.log(
        `Error en constructor() de ${this.getThisClass().name}:`,
        error,
        'data==>',
        JSON.stringify(this),
      );
    }
  }
  initializeMyData(data: any) {
    if (data && typeof data === 'object') {
      //Solo copia datamembers que tenga yo
      Object.assign(
        this,
        Object.fromEntries(Object.entries(data).filter(([key, value]) => Object.hasOwn(this, key))),
      );
    }
  }
  //Metodos estaticos de la clase base para todas las entidades (colecciones)
  // --- MÉTODOS ESTÁTICOS (Proxy de Table) ---
  static getLiveQuery$<T extends SlapBaseEntity>(querier: () => any): DexieObservable<T[]> {
    try {
      const observer$: DexieObservable<T[]> = liveQuery(querier) as unknown as DexieObservable<T[]>;
      return observer$;
    } catch (error) {
      console.log(`Error en getLiveQuery$() de ${this.name}:`, error);
      // Fallback to an empty observable to keep return type consistent
      return liveQuery(() => []) as unknown as DexieObservable<T[]>;
    }
  }

  //Ejecuta un query con parametros que entran a la querier, cuando los parametros cambian, el query se vuelve a ejecutar y devuelve un nuevo observable con los resultados actualizados
  //Devuelve un objeto con una funcion para actualizar los parametros y el observable con los resultados del query
  static getLiveQueryWithParams$<T extends SlapBaseEntity>(
    parameters: { [key: string]: any },
    querier: (params: { [key: string]: any }) => any): {
      setNewParams: (parameters: { [key: string]: any }) => void,
      $observer: RxObservable<T[]>
    } {
    try {
      //Defino la mutacion de los parametros para que el querier pueda acceder a ellos
      const _queryTrigger$ = new BehaviorSubject<{ [key: string]: any }>(parameters);
      const setNewParams = (newParams: { [key: string]: any }) => {
        const current = _queryTrigger$.getValue();
        _queryTrigger$.next({ ...current, ...newParams });
      }
      const $observer = _queryTrigger$.pipe(
        debounceTime(300),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        switchMap((params) =>
          from(this.getLiveQuery$<T>(() => querier(params)))
        )
      ) as unknown as RxObservable<T[]>;
      return {
        setNewParams,
        $observer
      }
    } catch (error) {
      console.log(`Error en getLiveQueryWithParams$() de ${this.name}:`, error);
      // Fallback to an empty observable to keep return type consistent
      return {
        setNewParams: (newParams: { [key: string]: any }) => { },
        $observer: from(liveQuery(() => [])) as unknown as RxObservable<T[]>
      };
    }
  }


  // Lectura
  static async get(id: any) {
    try {
      return await this.table.get(id);
    } catch (error) {
      console.log(`Error en get() de ${this.name}:`, error);
    }
  }

  static async all() {
    try {
      return await this.table.toArray();
    } catch (error) {
      console.log(`Error en all() de ${this.name}:`, error);
    }
  }

  static async count(): Promise<number | undefined> {
    try {
      return await this.table.count();
    } catch (error) {
      console.log(`Error en count() de ${this.name}:`, error);
    }
  }

  // Escritura Masiva
  static async bulkAdd(entities: any[]) {
    try {
      return await this.table.bulkAdd(entities);
    } catch (error) {
      console.log(`Error en bulkAdd(entities: any[]) de ${this.name}:`, error);
    }
  }

  static async bulkPut(entities: any[]) {
    try {
      return await this.table.bulkPut(entities);
    } catch (error) {
      console.log(`Error en bulkPut(entities: any[]) de ${this.name}:`, error);
    }
  }

  static async bulkDelete(ids: any[]) {
    try {
      return await this.table.bulkDelete(ids);
    } catch (error) {
      console.log(`Error en bulkDelete(ids: any[]) de ${this.name}:`, error);
    }
  }

  // Limpieza
  static async clear() {
    try {
      return await this.table.clear();
    } catch (error) {
      console.log(`Error en clear() de ${this.name}:`, error);
    }
  }

  // Consultas Rápidas
  static where(index: string) {
    try {
      return this.table.where(index);
    } catch (error) {
      console.log(`Error en where(index: string) de ${this.name}:`, error);
    }
  }

  static orderBy(index: string) {
    try {
      return this.table.orderBy(index);
    } catch (error) {
      console.log(`Error en orderBy(index: string) de ${this.name}:`, error);
    }
  }

  // Métodos personalizados de tu lógica SlapDb
  static async filterByEstado(estado: string) {
    try {
      return await this.table.where('estado').equals(estado).toArray();
    } catch (error) {
      console.log(`Error en filterByEstado de ${this.name}:`, error);
    }
  }

  // Método estático universal para contar registros
  static async contar(): Promise<number | undefined> {
    try {
      return await this.table.count();
    } catch (error) {
      console.log(`Error en contar() de ${this.name}:`, error);
    }
  }
  //Metodos estaticos de ayuda
  static getAt() {
    return Date.now();
  }
  //Metodos Staticos para Hooks
  static hookCreating = (
    primKey: any,
    obj: any,
    transaction: Transaction,
  ) => {
    try {
      if (!obj.id) {//Si no tiene ID, le asignamos uno nuevo
        obj.id = crypto.randomUUID(); //Genera una clave única
      }
      return obj.id; //Devuelve la PK para que Dexie la use
    } catch (error) {
      console.log(`Error en hookCreate() de ${this.name}:`, error);
    }
  };

  static hookDeleting = (
    primKey: any,
    obj: any,
    transaction: Transaction,
  ) => {
    try {
      //      hookContext.onsuccess = () => console.log('Borrado Succes con PK:', primKey);
      //      hookContext.onerror = (error) =>
      //        console.log(`Error en hookDeleting() -hookContext- de ${this.name}:`, error);
    } catch (error) {
      console.log(`Error en hookDeleting() de ${this.name}:`, error);
    }
  };

  static hookUpdating = (
    modifications: any,
    primKey: any,
    obj: any,
    transaction: Transaction,
  ) => {
    try {
      //      hookContext.onsuccess = (primKey) => console.log('Updating Succes con PK:', primKey);
      //      hookContext.onerror = (error) =>
      //        console.log(`Error en hookUpdating() -hookContext- de ${this.name}:`, error);
    } catch (error) {
      console.log(`Error en hookUpdating() de ${this.name}:`, error);
    }
  };

  static hookReading = (obj: any) => {
    try {
      return obj;
    } catch (error) {
      console.log(`Error en hookReading() de ${this.name}:`, error);
    }
  };

  //Metodos de instancia
  //Esto permite llamar members de clase desde una instancia
  protected getThisClass() {
    return this.constructor as typeof SlapBaseEntity;
  }

  // --- MÉTODOS DE INSTANCIA (Dentro de SlapBaseEntity) ---

  getObjectData = () => {
    const copiaDatos: any = {};
    for (const col of this.getThisClass()._columns) {
      if (Object.prototype.hasOwnProperty.call(this, col) && typeof this[col] !== 'function') {
        copiaDatos[col] = this[col];
      }
    }
    return copiaDatos;
  };
  patch = (obj: any) => {
    for (const key in obj) {
      this[key] = obj[key];
    }
  };
  /**
   * Guarda o actualiza la instancia actual en la base de datos.
   * Si no tiene ID y tienes un Hook de UUID, se le asignará uno.
   */
  async save(): Promise<string | number | undefined> {
    try {
      const table = this.getThisClass().table;
      // Guardamos y recuperamos la PK resultante
      const pk = await table.put(this.getObjectData());
      // Si la base de datos generó o cambió el ID, lo actualizamos en la instancia
      if (!this.id && typeof pk === 'string') {
        this.id = pk;
      }
      return pk;
    } catch (error) {
      console.log(
        `Error en save() de ${this.getThisClass().name}:`,
        error,
        'data==>',
        JSON.stringify(this),
      );
    }
  }

  /**
   * Elimina este registro específico de la base de datos.
   */
  async delete(): Promise<void> {
    try {
      if (!this.id) {
        throw new Error('No se puede eliminar una instancia que no tiene ID (no existe en DB).');
      }
      await this.getThisClass().table.delete(this.id);
    } catch (error) {
      console.log(
        `Error en delete() de ${this.getThisClass().name}:`,
        error,
        'data==>',
        JSON.stringify(this),
      );
    }
  }

  /**
   * Actualiza solo ciertos campos de la instancia actual.
   * Es más eficiente que save() si solo cambias una propiedad.
   */
  async update(changes: Partial<this>): Promise<number | undefined> {
    try {
      if (!this.id) {
        throw new Error('No se puede actualizar una instancia sin ID.');
      }

      // Aplicamos los cambios a la DB
      const updatedCount = await this.getThisClass().table.update(this.id, changes);

      // Si la DB se actualizó, aplicamos los cambios también a esta instancia en memoria
      if (updatedCount) {
        Object.assign(this, changes);
      }
      return updatedCount;
    } catch (error) {
      console.log(
        `Error en update() de ${this.getThisClass().name}:`,
        error,
        'data==>',
        JSON.stringify(this),
      );
    }
  }

  /**
   * Vuelve a cargar los datos desde la base de datos a esta instancia.
   * Útil si sospechas que los datos en disco cambiaron (ej. tras un Sync).
   */
  async reload(): Promise<this | undefined> {
    try {
      if (!this.id) return undefined;

      const freshData = await this.getThisClass().table.get(this.id);
      if (freshData) {
        Object.assign(this, freshData);
        return this;
      }
      return undefined;
    } catch (error) {
      console.log(
        `Error en reload() de ${this.getThisClass().name}:`,
        error,
        'data==>',
        JSON.stringify(this),
      );
    }
  }

  /**
   * Crea una copia exacta de esta instancia pero sin el ID.
   * Útil para funciones de "Duplicar".
   */
  clone(): this | undefined {
    try {
      const constructor = this.getThisClass();
      const copy = new (constructor as any)(this);
      delete copy.id;
      return copy;
    } catch (error) {
      console.log(
        `Error en clone() de ${this.getThisClass().name}:`,
        error,
        'data==>',
        JSON.stringify(this),
      );
    }
  }
}
//**********************Clase de borrado blando */

export abstract class SlapBaseEntitySoftDeleted extends SlapBaseEntity {
  static DEFAULT_ESTADO = 'pending'; //Estado por defecto cuando no tiene estado
  static DELETED_ESTADO = 'deleted'; //Cuando elimina localmente
  static UPDATED_ESTADO = 'updated'; //Cuando actualiza localmente
  static CREATED_ESTADO = 'created'; //Cuando recarga el registro desde el repo local

  static override schema = `${super.schema},status,createdAt,updatedAt,deletedAt`;
  @Column
  status!: string;
  @Column
  createdAt: number = 0;
  @Column
  updatedAt: number = 0;
  @Column
  deletedAt: number = 0;

  constructor(data?: Partial<SlapBaseEntity>) {
    super(data);
    this.initializeMyData(data);
    try {
      this.status = this.getThisClass().DEFAULT_ESTADO;
      this.createdAt = this.getThisClass().getAt();
    } catch (error) {
      console.log(
        `Error en constructor() de ${this.getThisClass().name}:`,
        error,
        'data==>',
        JSON.stringify(this),
      );
    }
  }

  //Metodos de ayuda de instancia para este y sus descencientes
  protected override getThisClass() {
    return super.getThisClass() as typeof SlapBaseEntitySoftDeleted;
  }

  /**
   * Elimina este registro específico de la base de datos.
   */
  override async delete(): Promise<void> {
    try {
      if (!this.id) {
        throw new Error('No se puede eliminar una instancia que no tiene ID (no existe en DB).');
      }
      await super.update({
        status: this.getThisClass().DELETED_ESTADO, //Borra porque le cambia el estado
        deletedAt: this.getThisClass().getAt(),
      } as Partial<this>);
    } catch (error) {
      console.log(
        `Error en delete() de ${this.getThisClass().name}:`,
        error,
        'data==>',
        JSON.stringify(this),
      );
    }
  }

  //Creamos hardDelete para poder borrar realmente lo que necesitemos
  async hardDelete(): Promise<void> {
    return super.delete();
  }

  //Modificamos los hook de Create y Update para asentar los estados y timestamps

  //Creating
  static override hookCreating = (
    primKey: any,
    obj: any,
    transaction: Transaction,
  ) => {
    obj.status = this.CREATED_ESTADO;
    obj.createdAt = this.getAt();
    return super.hookCreating(primKey, obj, transaction);
  };

  //Updating
  static override hookUpdating = (
    modifications: any,
    primKey: any,
    obj: any,
    transaction: Transaction,
  ) => {
    obj.status = this.UPDATED_ESTADO;
    obj.updatedAt = this.getAt();
    return super.hookUpdating(modifications, primKey, obj, transaction);
  };
}

//**********************Clase de replicación para SlapDb

export abstract class SlapBaseEntityWithReplycation extends SlapBaseEntitySoftDeleted {
  //Reescribe el Schema
  static override schema = `${super.schema},synchronized`;
  //adiciona los datamembers para controlar la sincronización
  @Column
  synchronized: boolean = false;
  constructor(data: Partial<SlapBaseEntityWithReplycation>) {
    super(data);
    this.initializeMyData(data);
  }

  //Modificamos los hook de Create y Update para asentar los estados y timestamps

  //Creating
  static override hookCreating = (
    primKey: any,
    obj: any,
    transaction: Transaction,
  ) => {
    obj.synchronized = false;
    return super.hookCreating(primKey, obj, transaction);
  };

  //Updating
  static override hookUpdating = (
    modifications: any,
    primKey: any,
    obj: any,
    transaction: Transaction,
  ) => {
    obj.synchronized = false;
    return super.hookUpdating(modifications, primKey, obj, transaction);
  };
}

//**********************Clase de replicación para SlapDb

export abstract class SlapBaseEntityWithReplycationCustomGenerateId extends SlapBaseEntitySoftDeleted {
  //Funcion asyncrona para generar el ID
  protected abstract generateCustomID(): Promise<string | undefined>
  override async save(): Promise<string | number | undefined> {
    //Aqui necesitamos traer todos los valores asyncronos de la session antes de grabar y guardarlos en el perfil
    if (!this.id) {
      this.id = await this.generateCustomID() || '';
    };
    return await super.save();
  }
}



//**********************Clase de base de datos generica
export class SlapDB extends Dexie {
  [key: string]: any; //Define un diccionario dinámico para la clase
  constructor(dbName: string, version: number = 1) {
    try {
      super(dbName);
      this.version(version).stores({});
      //Registra todas las clases que se han definido.
      Object.keys(registeredEntitys).forEach((key) => {
        if (registeredEntitys[key]) {
          //Que tenga una clase
          this.registerOneEntity(registeredEntitys[key]);
        }
      });
    } catch (error) {
      console.log('Error en el constructor de SlapDB:', error);
    }
  }

  // Método extendido para incluir el mapeo
  registerOneEntity(entityClass: typeof SlapBaseEntity) {
    try {
      const currentVersion = this.verno || 0;

      // Definimos el store
      this.version(currentVersion + 1).stores({
        [entityClass.name]: entityClass.schema,
      });

      // Mapeamos la tabla a la clase
      // Esto hace que db[tableName] devuelva instancias de entityClass
      this[entityClass.name].mapToClass(entityClass);
      registerEntity(entityClass, this[entityClass.name] as Table<any, any>);
    } catch (error) {
      console.log('Error en SlapDB.registerEntity:', error);
    }
  }
}
export const createSlapDBCallBack = (config: { [key: string]: any }) =>
  new SlapDB(config.name, config.version);


//Function de Register
const registerEntity = (classEntity: typeof SlapBaseEntity, table: Table<any, any>) => {
  //Asocia la tabla de Dexie y la entidad
  classEntity.table = table;
  //Registramos Hooks

  //Hook de creación
  classEntity.table.hook(
    // Registramos el hook "creating"
    'creating',
    classEntity.hookCreating
  );
  //Hook de borrado
  classEntity.table.hook(
    // Registramos el hook "deleting"
    'deleting',
    classEntity.hookDeleting
  );

  //Hook de updating
  classEntity.table.hook(
    // Registramos el hook "updating"
    'updating',
    classEntity.hookUpdating
  );

  //Hook de reading

  classEntity.table.hook('reading',
    classEntity.hookReading
  );
};
