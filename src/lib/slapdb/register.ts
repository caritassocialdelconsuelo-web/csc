/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Table, Transaction } from 'dexie';
import { type SlapBaseEntity } from './SlapBaseEntity';

//export const registeredEntitys: {
//  [key: string]: {
//    claseBase: typeof SlapBaseEntity,
//    claseHeredada: typeof SlapBaseEntity,
//    syncTableName: string
//  }
//} = {};

//Function de Register
export const registerEntity = (classEntity: typeof SlapBaseEntity, table: Table<any, any>) => {
  console.log(
    `registerEntity--->Registrando la clase de la entidad ${classEntity._configuration.schemaInfo.entityName} en la tabla: ${table.name} de Dexie`,
  );
  //Asocia la tabla de Dexie y la entidad
  classEntity._configuration.dbstate.table = table;
  //Registramos Hooks

  //Hook de creación
  classEntity._configuration.dbstate.table.hook(
    'creating',
    (primKey: any, obj: any, transaction: Transaction) => {
      return classEntity.hookCreating(classEntity, primKey, obj, transaction);
    },
  );
  //(classEntity.hookCreating as any).relClass = classEntity;

  //Hook de borrado
  classEntity._configuration.dbstate.table.hook(
    // Registramos el hook "deleting"
    'deleting',
    (primKey: any, obj: any, transaction: Transaction) => {
      return classEntity.hookDeleting(classEntity, primKey, obj, transaction);
    },
  );
  //(classEntity.hookDeleting as any).relClass = classEntity;

  //Hook de updating
  classEntity._configuration.dbstate.table.hook(
    // Registramos el hook "updating"
    'updating',
    (modifications: any, primKey: any, obj: any, transaction: Transaction) => {
      return classEntity.hookUpdating(classEntity, modifications, primKey, obj, transaction);
    },
  );
  //(classEntity.hookUpdating as any).relClass = classEntity;
  //Hook de reading

  classEntity._configuration.dbstate.table.hook('reading', (obj: any) => {
    return classEntity.hookReading(classEntity, obj);
  });
};
