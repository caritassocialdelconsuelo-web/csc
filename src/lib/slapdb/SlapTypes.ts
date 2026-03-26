/* eslint-disable @typescript-eslint/no-explicit-any */
import { type SupabaseClient } from '@supabase/supabase-js';
import type { Table } from 'dexie';
import type { Ref } from 'vue';
import type { Destructibles } from './SlapDestructibles';
import type { SlapBaseEntity } from './SlapBaseEntity';

export interface ICustomScriptCode {
  get sqlCode(): string;
  get codeDescription(): string;
}
export interface ICustomGeneratorID {
  generateId(): Promise<string | undefined>;
}
export interface IRealtimeSynchronize {
  runFullSync(supabase: SupabaseClient<any, any, 'public', any, any>): Promise<void>;
  realtimeSyncSetup(supabase: SupabaseClient<any, any, 'public', any, any>): Promise<void>;
  realtimeHandle(
    supabase: SupabaseClient<any, any, 'public', any, any>,
    payload: unknown,
  ): Promise<void>;
  handleOnline(supabase: SupabaseClient<any, any, 'public', any, any>): Promise<void>;
  handleOffline(): void;
}
export interface IDictionary<T> {
  [key: string]: T;
}
export type TColumnType = 'metadata' | 'data' | 'key' | 'system' | 'computed' | 'reference' | 'referred';

export interface IColumnDescriptor {
  name: string;
  indexed: boolean;
  tipo: TColumnType;
  funcToMainClass?: () => typeof SlapBaseEntity;
  funcToChildClass?: () => typeof SlapBaseEntity;
  funcFieldReference?: (children: SlapBaseEntity) => any;
  referenceFieldName?: string;
  funcFieldReferred?: (main: SlapBaseEntity) => any;
}
export interface IConfigSlapEntity {
  schemaInfo: {
    columns: IDictionary<IColumnDescriptor>;
    metadataColumns: IDictionary<IColumnDescriptor>;
    keyColumns: IDictionary<IColumnDescriptor>;
    systemColumns: IDictionary<IColumnDescriptor>;
    referredColumns: IDictionary<IColumnDescriptor>;
    referenceColumns: IDictionary<IColumnDescriptor>;
    indexedColumns: IDictionary<string>; //Lista de columnas que se deben indexar en la base de datos, se setea con el decorador @Column({indexed:true})
    indexCompositeKeys: IDictionary<string[]>; //Objeto que define las claves compuestas para índices, la clave es el nombre del índice y el valor es un array de columnas que forman la clave compuesta, se setea con el decorador @Column({indexComposite:'indexName'})
    entityName?: string; //Nombre de la entidad, se setea con el decorador @Entity
  };
  dbstate: {
    table: Table<any, any>;
    registrable: boolean; //Indica si esta clase se registra en la base de datos, por defecto es false, las clases que se quieran registrar deden usar el decorador @Entity, que setea este valor a true
    registered: boolean; //Indica si esta clase ya se ha registrado en la base de datos, para evitar registros duplicados, se setea a true cuando se registra la clase
    syncTableName?: string; //Nombre de la tabla en la base de datos, se setea con el decorador @Entity, si no se setea se usa el nombre de la clase
  };
}
export type TDataSlapEntity = Ref<IDictionary<any>>;
/*export type TDatasSlapEntity = {
  weakMap: WeakMap<symbol, TDataSlapEntity>;
  keys: Map<string, symbol>;
};*/
export interface IcurrentDbData {
  persisted: boolean;
}
export interface IDestructibleAssociated {
  referrers: WeakRef<Destructibles>[];
  associatedData: Ref<any>;
}
