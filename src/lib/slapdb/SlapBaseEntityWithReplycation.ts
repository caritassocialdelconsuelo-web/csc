/* eslint-disable @typescript-eslint/no-explicit-any */
import { Transaction } from 'dexie';
import { Column } from './decorators';
import { SlapBaseEntitySoftDeleted } from './SlapBaseEntitySoftDeleted';

//**********************Clase de replicación para SlapDb
export class SlapBaseEntityWithReplycation extends SlapBaseEntitySoftDeleted {
  //Reescribe el Schema
  static syncTableName: string = '';
  //adiciona los datamembers para controlar la sincronización
  @Column('metadata', true)
  synchronized: boolean = false;
  @Column('system', true)
  lastCheckPoint: number = 0; //Campo para controlar el checkpoint de replicación, se actualiza cada vez que se sincroniza con el servidor, para saber desde qué punto se debe replicar en la siguiente sincronización
  constructor(data: Partial<SlapBaseEntityWithReplycation>) {
    super(data);
    this.initializeMyData(data);
  }

  //Metodos de ayuda de instancia para este y sus descencientes
  protected override get staticSelf() {
    return super.staticSelf as unknown as typeof SlapBaseEntityWithReplycation;
  }

  //Modificamos los hook de Create y Update para asentar los estados y timestamps

  //Creating
  static override hookCreating = (primKey: any, obj: any, transaction: Transaction) => {
    const key = super.hookCreating(primKey, obj, transaction);
    obj.synchronized = (transaction as unknown as any).additionalData?.synchronizating || false; //Si se fuerza la sincronización, reseteamos el checkpoint para que se replique todo lo que tenga el servidor, si no se fuerza, mantenemos el checkpoint actual para no perder la referencia de hasta dónde se ha replicado.
    obj.lastCheckPoint =
      obj.lastCheckPoint || (transaction as unknown as any).additionalData?.newCheckPoint || 0; //Al crear un nuevo registro, se le asigna el checkpoint actual de la sincronización para que se replique correctamente en la siguiente sincronización, si no se fuerza la sincronización, se mantiene el checkpoint actual para no perder la referencia de hasta dónde se ha replicado.
    return key;
  };

  //Updating
  static override hookUpdating = (
    modifications: any,
    primKey: any,
    obj: any,
    transaction: Transaction,
  ) => {
    const synchronization =
      (transaction as unknown as any).additionalData?.synchronizating || false;
    const newCheckPoint = (transaction as unknown as any).additionalData?.newCheckPoint;
    const lastCheckPoint =
      modifications.lastCheckPoint !== undefined
        ? obj.lastCheckPoint < modifications.lastCheckPoint
          ? modifications.lastCheckPoint
          : obj.lastCheckPoint
        : obj.lastCheckPoint !== undefined
          ? obj.lastCheckPoint
          : newCheckPoint || 0; //Revisar esto!!!!
    const myModifications = {
      ...modifications,
      ...super.hookUpdating(modifications, primKey, obj, transaction),
      synchronized: synchronization, //Si synchronization es true quiere decir que la operación de modificación es del syncronizador, por lo que se debe marcar el registro como sincronizado, si es false, se pone que no esta synchronizado.
      //Le pasamos el ultimo checkpoint del registro que esta en la base de datos no el del objeto, siempre el mayor
      lastCheckPoint,
    };

    //delete myModifications.synchronization; //Elimina el campo temporal de sincronización que se puede usar al crear o actualizar un registro para forzar su sincronización inmediata, pero que no se guarda en la base de datos ni se replica al servidor, solo es un "flag" temporal para controlar la sincronización desde la instancia.
    return myModifications;
  };
}
