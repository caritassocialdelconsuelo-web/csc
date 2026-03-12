/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Table, liveQuery, Transaction, Observable } from "dexie";
import { BehaviorSubject, debounceTime, distinctUntilChanged, switchMap, from } from "rxjs";
import { Column } from "./decorators";
import { useDatabase } from "src/composables/useDb";

//Clase base para todas las entidades con ID generado por UUID
export class SlapBaseEntity {
  static _columns = [];
  static table: Table<any, any>;
  static registrable: boolean = false;//Indica si esta clase se registra en la base de datos, por defecto es false, las clases que se quieran registrar deden usar el decorador @Entity, que setea este valor a true
  static registered: boolean = false;//Indica si esta clase ya se ha registrado en la base de datos, para evitar registros duplicados, se setea a true cuando se registra la clase
  [key: string]: any; //Define un diccionario dinámico para la clase
  @Column
  id: string | null = null;

  static schema = 'id';

  //Constructor genérico
  constructor(data?: Partial<SlapBaseEntity>) {
    try {
      //      this.getThisClass().checkRegistered();
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
  //Funcion estatica que se autoregistra cuando se crea el primer objeto
  //static checkRegistered() {
  //  if (!this.registered && this.registrable) {
  //    const db = useDatabase({}).db.value;
  //    if (db) {
  //      db.registerOneEntity({
  //        baseClass: this as unknown as typeof SlapBaseEntity,
  //        syncTableName: (this as any).syncTableName || ''});
  //    }
  //  }
  //}

  initializeMyData(data: any) {
    if (data && typeof data === 'object') {
      //Solo copia datamembers que tenga yo
      Object.assign(
        this,
        Object.fromEntries(Object.entries(data).filter(([key]) => Object.hasOwn(this, key))),
      );
    }
  }
  //Metodos estaticos de la clase base para todas las entidades (colecciones)
  // --- MÉTODOS ESTÁTICOS (Proxy de Table) ---
  static getLiveQuery$<T extends SlapBaseEntity>(querier: () => any): Observable<T[]> {
    try {
      const observer$: Observable<T[]> = liveQuery(querier) as unknown as Observable<T[]>;
      return observer$;
    } catch (error) {
      console.log(`Error en getLiveQuery$() de ${this.name}:`, error);
      // Fallback to an empty observable to keep return type consistent
      return liveQuery(() => []) as unknown as Observable<T[]>;
    }
  }

  //Ejecuta un query con parametros que entran a la querier, cuando los parametros cambian, el query se vuelve a ejecutar y devuelve un nuevo observable con los resultados actualizados
  //Devuelve un objeto con una funcion para actualizar los parametros y el observable con los resultados del query
  static getLiveQueryWithParams$<T extends SlapBaseEntity>(
    parameters: { [key: string]: any },
    querier: (params: { [key: string]: any }) => any): {
      setNewParams: (parameters: { [key: string]: any }) => void,
      $observer: Observable<T[]>
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
      ) as unknown as Observable<T[]>;
      return {
        setNewParams,
        $observer
      }
    } catch (error) {
      console.log(`Error en getLiveQueryWithParams$() de ${this.name}:`, error);
      // Fallback to an empty observable to keep return type consistent
      return {
        setNewParams: (newParams: { [key: string]: any }) => { Object.assign(parameters, newParams); },
        $observer: from(liveQuery(() => [])) as unknown as Observable<T[]>
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
  protected get staticSelf() {
    return this.constructor as typeof SlapBaseEntity;
  }

  // --- MÉTODOS DE INSTANCIA (Dentro de SlapBaseEntity) ---

  getObjectData() {
    const copiaDatos: any = {};
    for (const col of this.staticSelf._columns) {
      if (Object.prototype.hasOwnProperty.call(this, col) && typeof this[col] !== 'function') {
        copiaDatos[col] = this[col];
      }
    }
    return copiaDatos;
  };
  patch(obj: any) {
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
      const table = this.staticSelf.table;
      // Guardamos y recuperamos la PK resultante
      const pk = await table.put(this.getObjectData());
      // Si la base de datos generó o cambió el ID, lo actualizamos en la instancia
      if (!this.id && typeof pk === 'string') {
        this.id = pk;
      }
      return pk;
    } catch (error) {
      console.log(
        `Error en save() de ${this.staticSelf.name}:`,
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
      await this.staticSelf.table.delete(this.id);
    } catch (error) {
      console.log(
        `Error en delete() de ${this.staticSelf.name}:`,
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
      const updatedCount = await this.staticSelf.table.update(this.id, changes);

      // Si la DB se actualizó, aplicamos los cambios también a esta instancia en memoria
      if (updatedCount) {
        Object.assign(this, changes);
      }
      return updatedCount;
    } catch (error) {
      console.log(
        `Error en update() de ${this.staticSelf.name}:`,
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

      const freshData = await this.staticSelf.table.get(this.id);
      if (freshData) {
        Object.assign(this, freshData);
        return this;
      }
      return undefined;
    } catch (error) {
      console.log(
        `Error en reload() de ${this.staticSelf.name}:`,
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
      const constructor = this.staticSelf as unknown as new (data?: Partial<this>) => this;
      const copy = new (constructor)(this);
      copy.id = null;
      return copy;
    } catch (error) {
      console.log(
        `Error en clone() de ${this.staticSelf.name}:`,
        error,
        'data==>',
        JSON.stringify(this),
      );
    }
  }
}
