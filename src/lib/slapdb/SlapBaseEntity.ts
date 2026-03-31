/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { liveQuery, Transaction, Observable, IndexableType } from 'dexie';
import { BehaviorSubject, debounceTime, distinctUntilChanged, switchMap, from } from 'rxjs';
import { Column } from './decorators';
import { IConfigSlapEntity, TDataSlapEntity } from './SlapTypes';
import { mergeObjects, Metaclass } from '../utils';
import { Destructibles } from './SlapDestructibles';
import { SlapBaseEntityWithReplycation } from './SlapBaseEntityWithReplycation';

//Clase base para todas las entidades con ID generado por UUID
export class SlapBaseEntity extends Destructibles {
  static _myConfiguration: IConfigSlapEntity;

  static [key: string]: any;

  protected static checkMyConfiguration() {
    return this.checkOwnPropertyClass('_myConfiguration', {
      schemaInfo: {
        columns: {},
        metadataColumns: {},
        keyColumns: {},
        systemColumns: {},
        indexedColumns: {},
        indexCompositeKeys: {},
        referredColumns: {},
        referenceColumns: {},
      },
      dbstate: {},
    });
  }
  private static checkOwnPropertyClass(key: string, initiaValue: any) {
    if (!Object.hasOwn(this, key)) {
      Object.defineProperty(this, key, {
        value: initiaValue,
        enumerable: true,
        writable: true,
      });
    }
    return this[key];
  }
  public static get _configuration(): IConfigSlapEntity {
    return this.checkMyConfiguration();
  }
  public static set _configuration(newVal: IConfigSlapEntity) {
    if (this.checkMyConfiguration()) {
      this._myConfiguration = newVal;
    }
  }

  public static get _composeConfiguration(): IConfigSlapEntity {
    return mergeObjects(
      Object.getPrototypeOf(this)?._composeConfiguration || {},
      this._configuration,
    );
  }

  static get schema() {
    return Object.keys(this._composeConfiguration.schemaInfo.indexedColumns).join(',') || 'id';
  } //Definimos el schema base con ID y las columnas indexadas, las columnas indexadas se definen con el decorador @Column({indexed:true})
  _persisted: boolean = false;
  _newObject: boolean = true;

  public static getUniqueKey(obj: any) {
    const key = Object.keys(this._composeConfiguration.schemaInfo.keyColumns)
      .map((key) => obj[key])
      .join('_');
    return key;
  }

  public getField(key: string) {
    const data = this.refAssociatedData;
    if (data?.value) {
      if (key in data.value) {
        return data.value[key];
      }
    }
  }
  public setField(key: string, newVal: any) {
    this.associatedData = { ...this.associatedData, ...{ [key]: newVal } };
    this._persisted = false; //Siempre decimos que este cambio no fue persistido.
  }

  [key: string]: any; //Define un diccionario dinámico para la clase

  _updating: boolean;
  @Column('key')
  id: string | null = null;

  //Constructor genérico
  constructor(data?: TDataSlapEntity, fromDb: boolean = false) {
    const key = fromDb && data ? new.target.getUniqueKey(data) : null;
    super(key);
    this._updating = false;
  }

  //Metodos estaticos de la clase base para todas las entidades (colecciones)
  // --- MÉTODOS ESTÁTICOS (Proxy de Table) ---
  static getLiveQuery$<T extends SlapBaseEntity>(querier: () => any): Observable<T[]> {
    try {
      const observer$: Observable<T[]> = liveQuery(querier) as unknown as Observable<T[]>;
      return observer$;
    } catch (error) {
      console.log(
        `Error en getLiveQuery$() de la clase de la entidad ${this._composeConfiguration.schemaInfo.entityName}:`,
        error,
      );
      // Fallback to an empty observable to keep return type consistent
      return liveQuery(() => []) as unknown as Observable<T[]>;
    }
  }

  //Ejecuta un query con parametros que entran a la querier, cuando los parametros cambian, el query se vuelve a ejecutar y devuelve un nuevo observable con los resultados actualizados
  //Devuelve un objeto con una funcion para actualizar los parametros y el observable con los resultados del query
  static getLiveQueryWithParams$<T extends SlapBaseEntity>(
    parameters: { [key: string]: any },
    querier: (params: { [key: string]: any }) => any,
  ): {
    setNewParams: (parameters: { [key: string]: any }) => void;
    $observer: Observable<T[]>;
  } {
    try {
      //Defino la mutacion de los parametros para que el querier pueda acceder a ellos
      const _queryTrigger$ = new BehaviorSubject<{ [key: string]: any }>(parameters);
      const setNewParams = (newParams: { [key: string]: any }) => {
        const current = _queryTrigger$.getValue();
        _queryTrigger$.next({ ...current, ...newParams });
      };
      const $observer = _queryTrigger$.pipe(
        debounceTime(300),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        switchMap((params) => from(this.getLiveQuery$<T>(() => querier(params)))),
      ) as unknown as Observable<T[]>;
      return {
        setNewParams,
        $observer,
      };
    } catch (error) {
      console.log(
        `Error en getLiveQueryWithParams$() de la clase de la entidad ${this._composeConfiguration.schemaInfo.entityName}:`,
        error,
      );
      // Fallback to an empty observable to keep return type consistent
      return {
        setNewParams: (newParams: { [key: string]: any }) => {
          Object.assign(parameters, newParams);
        },
        $observer: from(liveQuery(() => [])) as unknown as Observable<T[]>,
      };
    }
  }
  static instanceClass(obj: any) {
    if (obj.class) {
      const myClass: Metaclass<typeof SlapBaseEntity> = obj.class;
      delete obj.class;
      return new myClass(obj, true);
    } else {
      return obj;
    }
  }
  // Lectura
  static get table() {
    const conf = this._composeConfiguration;
    return conf.dbstate.db.table(conf.schemaInfo.entityName || '');
  }
  static async get(id: any) {
    try {
      return await this.table.get(id);
    } catch (error) {
      console.log(
        `Error en get() de la clase de la entidad ${this._composeConfiguration.schemaInfo.entityName}:`,
        error,
      );
    }
  }

  static async all() {
    try {
      return await this.table.toArray();
    } catch (error) {
      console.log(
        `Error en all() de la clase de la entidad ${this._composeConfiguration.schemaInfo.entityName}:`,
        error,
      );
    }
  }

  static async count(): Promise<number | undefined> {
    try {
      return await this.table.count();
    } catch (error) {
      console.log(
        `Error en count() de la clase de la entidad ${this._composeConfiguration.schemaInfo.entityName}:`,
        error,
      );
    }
  }

  // Escritura Masiva
  static async bulkAdd(entities: any[]) {
    try {
      return await this.table.bulkAdd(entities);
    } catch (error) {
      console.log(
        `Error en bulkAdd(entities: any[]) de la clase de la entidad ${this._composeConfiguration.schemaInfo.entityName}:`,
        error,
      );
    }
  }

  static async bulkPut(entities: any[]) {
    try {
      return await this.table.bulkPut(entities);
    } catch (error) {
      console.log(
        `Error en bulkPut(entities: any[]) de la clase de la entidad ${this._composeConfiguration.schemaInfo.entityName}:`,
        error,
      );
    }
  }

  static async bulkDelete(ids: any[]) {
    try {
      return await this.table.bulkDelete(ids);
    } catch (error) {
      console.log(
        `Error en bulkDelete(ids: any[]) de la clase de la entidad ${this._composeConfiguration.schemaInfo.entityName}:`,
        error,
      );
    }
  }

  // Limpieza
  static async clear() {
    try {
      return await this.table.clear();
    } catch (error) {
      console.log(
        `Error en clear() de la clase de la entidad ${this._composeConfiguration.schemaInfo.entityName}:`,
        error,
      );
    }
  }

  // Consultas Rápidas
  static where(index: string) {
    try {
      return this.table.where(index);
    } catch (error) {
      console.log(
        `Error en where(index: string) de la clase de la entidad ${this._composeConfiguration.schemaInfo.entityName}:`,
        error,
      );
    }
  }

  static orderBy(index: string) {
    try {
      return this.table.orderBy(index);
    } catch (error) {
      console.log(
        `Error en orderBy(index: string) de la clase de la entidad ${this._composeConfiguration.schemaInfo.entityName}:`,
        error,
      );
    }
  }

  // Métodos personalizados de tu lógica SlapDb
  static async filterByEstado(estado: string) {
    try {
      return await this.table.where('estado').equals(estado).toArray();
    } catch (error) {
      console.log(
        `Error en filterByEstado de la clase de la entidad ${this._composeConfiguration.schemaInfo.entityName}:`,
        error,
      );
    }
  }
  static checkInMemory(key: string, obj: any) {
    const refData = this.getRefAssociatedData(key);
    if (refData) {
      if (!refData.value) {
        refData.value = { ...obj };
      } else {
        refData.value = mergeObjects(refData.value, obj);
      }
    }
  }
  // Método estático universal para contar registros
  static async contar(): Promise<number | undefined> {
    try {
      return await this.table.count();
    } catch (error) {
      console.log(
        `Error en contar() de la clase de la entidad ${this._composeConfiguration.schemaInfo.entityName}:`,
        error,
      );
    }
  }
  //Metodos estaticos de ayuda
  static getAt() {
    return Date.now();
  }
  //Metodos Staticos para Hooks
  static hookCreating(
    myClass: Metaclass<typeof SlapBaseEntity>,
    primKey: any,
    obj: any,
    transaction: Transaction,
  ) {
    try {
      if (!obj.id) {
        //Si no tiene ID, le asignamos uno nuevo
        obj.id = crypto.randomUUID(); //Genera una clave única
      }
      if ('objectCreator' in obj) {
        const objectCreator: SlapBaseEntity = obj.objectCreator;
        delete obj.objectCreator;
        objectCreator.associatedData = obj;
      }
      myClass.checkInMemory(obj.id, obj);
      return obj.id; //Devuelve la PK para que Dexie la use
    } catch (error) {
      console.log(
        `Error en hookCreate() de la clase de la entidad ${this._composeConfiguration.schemaInfo.entityName}:`,
        error,
      );
    }
  }

  static hookDeleting(
    myClass: Metaclass<typeof SlapBaseEntity>,
    primKey: any,
    obj: any,
    transaction: Transaction,
  ) {
    try {
      //      hookContext.onsuccess = () => console.log('Borrado Succes con PK:', primKey);
      //      hookContext.onerror = (error) =>
      //        console.log(`Error en hookDeleting() -hookContext- de ${this.entityName}:`, error);
    } catch (error) {
      console.log(
        `Error en hookDeleting() de la clase de la entidad ${this._composeConfiguration.schemaInfo.entityName}:`,
        error,
      );
    }
  }

  static hookUpdating(
    myClass: Metaclass<typeof SlapBaseEntity>,
    modifications: any,
    primKey: any,
    obj: any,
    transaction: Transaction,
  ) {
    try {
      myClass.checkInMemory(primKey, modifications);
      return modifications; //Devuelve las modificaciones para que Dexie las aplique
    } catch (error) {
      console.log(
        `Error en hookUpdating() de la clase de la entidad ${this._composeConfiguration.schemaInfo.entityName}:`,
        error,
      );
    }
  }

  static hookReading(myClass: Metaclass<typeof SlapBaseEntity>, obj: any) {
    try {
      if (myClass) {
        const obj1 = new myClass(obj, true);
        return obj1;
      } else {
        return obj;
      }
    } catch (error) {
      console.log(
        `Error en hookReading() de la clase de la entidad ${this._composeConfiguration.schemaInfo.entityName}:`,
        error,
      );
    }
  }

  //Metodos de instancia
  //Esto permite llamar members de clase desde una instancia
  protected override get staticSelf() {
    return this.constructor as typeof SlapBaseEntity;
  }
  static getStaticObjectData<T extends SlapBaseEntity>(
    item: T,
    forSynchronization: boolean = false,
  ) {
    if (forSynchronization) {
      //Genera objeto para syncronizacion con supabase
      const copiaData: any = {};
      const copiaMetaData: any = {};
      const copiaKeys: any = {};
      const copiaSystem: any = {};
      const copiaReferred: any = {};

      const composeConfig = this._composeConfiguration;

      for (const col in composeConfig.schemaInfo.columns) {
        if (col in item) {
          const data = item[col];
          if (typeof data !== 'function') copiaData[col] = data;
        }
      }
      for (const col in composeConfig.schemaInfo.metadataColumns) {
        if (col in item) {
          const data = item[col];
          if (typeof data !== 'function') copiaMetaData[`_${col}`] = data;
        }
      }
      for (const col in composeConfig.schemaInfo.keyColumns) {
        if (col in item) {
          const data = item[col];
          if (typeof data !== 'function') copiaKeys[`${col === 'id' ? '' : '_pk_'}${col}`] = data;
        }
      }
      for (const col in composeConfig.schemaInfo.systemColumns) {
        if (col in item) {
          const data = item[col];
          if (typeof data !== 'function') copiaSystem[`_${col}`] = data;
        }
      }
      for (const col in composeConfig.schemaInfo.referredColumns) {
        if (col in item) {
          const data = item.getField(col); //Obtenemos la clave el Id no el objeto que devuelve el get.
          if (typeof data !== 'function') copiaReferred[col] = data;
        }
      }

      return {
        ...copiaKeys,
        //...(forSynchronization ? copiaSystem : {}),
        ...copiaSystem,
        ...copiaData,
        ...copiaMetaData,
        ...copiaReferred,
      };
    } else {
      if (item) {
        const referrer = item.refAssociatedData;
        if (referrer) {
          return item._newObject
            ? { ...referrer.value, ...{ objectCreator: item } }
            : referrer.value;
        }
      }
      return undefined;
    }
  }

  // --- MÉTODOS DE INSTANCIA (Dentro de SlapBaseEntity) ---

  getObjectData() {
    return this.staticSelf.getStaticObjectData(this);
  }

  patch(obj: any) {
    for (const key in obj) {
      this[key] = obj[key];
    }
  }
  /**
   * Guarda o actualiza la instancia actual en la base de datos.
   * Si no tiene ID y tienes un Hook de UUID, se le asignará uno.
   */
  async save(): Promise<IndexableType | null | undefined> {
    try {
      const table = this.staticSelf.table;
      if (!this.id) {
        if ('generateId' in this && typeof this.generateId === 'function') {
          this.id = await this.generateId();
        } //Si no implementa custom generator ID, se le asignará un UUID en el hook de creación de la base de datos
      }
      const objData = this.staticSelf.getStaticObjectData(this, true);
      // Guardamos y recuperamos la PK resultante
      const lastUsedkey = this.id;
      this._updating = true;
      const pk = await table.put(objData);
      // Si la base de datos generó o cambió el ID, lo actualizamos en la instancia
      if (
        ((!this.id || !lastUsedkey) && typeof pk === 'string') ||
        ((this.id || lastUsedkey) &&
          typeof pk === 'string' &&
          (this.id !== pk || lastUsedkey !== pk))
      ) {
        this.id = pk;
        this.internalKey = pk;
        //Cambio de clave
        for (const col in this.staticSelf._composeConfiguration.schemaInfo.referenceColumns) {
          const field = this.staticSelf._composeConfiguration.schemaInfo.referenceColumns[col];
          for (const reference of this[col]) {
            if (field?.referenceFieldName) {
              if (reference.getField(field.referenceFieldName) !== pk) {
                reference[field.referenceFieldName] = pk;
              }
            }
          }
        }
      }
      //Persistir no persistidos.
      for (const col in this.staticSelf._composeConfiguration.schemaInfo.referenceColumns) {
        for (const reference of this[col]) {
          if (!reference._persisted) {
            await reference.save();
          }
        }
      }
      this._persisted = true;
      this._newObject = false;
      setTimeout(
        () => {
          void this.staticSelf._composeConfiguration.dbstate.db.syncTable(
            this.staticSelf._composeConfiguration.dbstate.db._supabase,
            this.staticSelf as unknown as SlapBaseEntityWithReplycation,
          );
        },
        import.meta.env.VITE_SUPABASE_IMMEDIATE_MS || 300,
      );
      return pk;
    } catch (error) {
      console.log(
        `Error en save() de la clase de la entidad ${this.staticSelf._composeConfiguration.schemaInfo.entityName}:`,
        error,
        'data==>',
        JSON.stringify(this),
      );
    } finally {
      this._updating = false;
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
        `Error en delete() de la clase de la entidad ${this.staticSelf._composeConfiguration.schemaInfo.entityName}:`,
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
        `Error en update() de la clase de la entidad ${this.staticSelf._composeConfiguration.schemaInfo.entityName}:`,
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
        `Error en reload() de la clase de la entidad ${this.staticSelf._composeConfiguration.schemaInfo.entityName}:`,
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
      const copy = new constructor(this);
      copy.id = null;
      return copy;
    } catch (error) {
      console.log(
        `Error en clone() de la clase de la entidad ${this.staticSelf._composeConfiguration.schemaInfo.entityName}:`,
        error,
        'data==>',
        JSON.stringify(this),
      );
    }
  }
}
