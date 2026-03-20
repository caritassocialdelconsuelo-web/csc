/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Table } from 'dexie';
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
    // Registramos el hook "creating"
    'creating',
    classEntity.hookCreating,
  );
  //Hook de borrado
  classEntity._configuration.dbstate.table.hook(
    // Registramos el hook "deleting"
    'deleting',
    classEntity.hookDeleting,
  );

  //Hook de updating
  classEntity._configuration.dbstate.table.hook(
    // Registramos el hook "updating"
    'updating',
    classEntity.hookUpdating,
  );

  //Hook de reading

  classEntity._configuration.dbstate.table.hook('reading', classEntity.hookReading);
};
