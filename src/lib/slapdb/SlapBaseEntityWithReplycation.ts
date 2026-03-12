/* eslint-disable @typescript-eslint/no-explicit-any */
import { Transaction } from "dexie";
import { Column } from "./decorators";
import { SlapBaseEntitySoftDeleted } from "./SlapBaseEntitySoftDeleted";

//**********************Clase de replicación para SlapDb
export abstract class SlapBaseEntityWithReplycation extends SlapBaseEntitySoftDeleted {
  //Reescribe el Schema
  static override schema = `${super.schema},synchronized`;
  static syncTableName: string = '';
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
