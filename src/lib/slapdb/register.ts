/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Transaction } from 'dexie';
import { type SlapBaseEntity } from './SlapBaseEntity';
import { type SlapDB } from '.';

//export const registeredEntitys: {
//  [key: string]: {
//    claseBase: typeof SlapBaseEntity,
//    claseHeredada: typeof SlapBaseEntity,
//    syncTableName: string
//  }
//} = {};

//Function de Register
export const registerEntity = (classEntity: typeof SlapBaseEntity, db: SlapDB) => {
  console.log(
    `registerEntity--->Registrando la clase de la entidad ${classEntity._configuration.schemaInfo.entityName} `,
  );
  //Asocia la tabla de Dexie y la entidad
  classEntity._configuration.dbstate.db = db;
  //Registramos Hooks
  const table = classEntity.table;
  //Hook de creación
  table.hook('creating', (primKey: any, obj: any, transaction: Transaction) => {
    return classEntity.hookCreating(classEntity, primKey, obj, transaction);
  });
  //(classEntity.hookCreating as any).relClass = classEntity;

  //Hook de borrado
  table.hook(
    // Registramos el hook "deleting"
    'deleting',
    (primKey: any, obj: any, transaction: Transaction) => {
      return classEntity.hookDeleting(classEntity, primKey, obj, transaction);
    },
  );
  //(classEntity.hookDeleting as any).relClass = classEntity;

  //Hook de updating
  table.hook(
    // Registramos el hook "updating"
    'updating',
    (modifications: any, primKey: any, obj: any, transaction: Transaction) => {
      return classEntity.hookUpdating(classEntity, modifications, primKey, obj, transaction);
    },
  );
  //(classEntity.hookUpdating as any).relClass = classEntity;
  //Hook de reading

  table.hook('reading', (obj: any) => {
    return classEntity.hookReading(classEntity, obj);
  });
};
