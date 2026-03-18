/* eslint-disable @typescript-eslint/no-explicit-any */
//**********************Clase de borrado blando */

import { Transaction } from 'dexie';
import { Column } from './decorators';
import { SlapBaseEntity } from './SlapBaseEntity';

export class SlapBaseEntitySoftDeleted extends SlapBaseEntity {
  static DEFAULT_ESTADO = 'pending'; //Estado por defecto cuando no tiene estado
  static DELETED_ESTADO = 'deleted'; //Cuando elimina localmente
  static UPDATED_ESTADO = 'updated'; //Cuando actualiza localmente
  static CREATED_ESTADO = 'created'; //Cuando recarga el registro desde el repo local

  @Column('metadata', true)
  status!: string;
  @Column('metadata', true)
  createdAt: number = 0;
  @Column('metadata', true)
  updatedAt: number = 0;
  @Column('metadata', true)
  deletedAt: number = 0;

  constructor(data?: Partial<SlapBaseEntity>) {
    super(data);
    this.initializeMyData(data);
    try {
      this.status = this.staticSelf.DEFAULT_ESTADO;
      this.createdAt = this.staticSelf.getAt();
    } catch (error) {
      console.log(
        `Error en constructor() de la clase de la entidad ${this.getThisClass().entityName}:`,
        error,
        'data==>',
        JSON.stringify(this),
      );
    }
  }

  //Metodos de ayuda de instancia para este y sus descencientes
  protected override get staticSelf() {
    return super.staticSelf as unknown as typeof SlapBaseEntitySoftDeleted;
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
        `Error en delete() de la clase de la entidad ${this.getThisClass().entityName}:`,
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
  static override hookCreating = (primKey: any, obj: any, transaction: Transaction) => {
    const key = super.hookCreating(primKey, obj, transaction);
    obj.status = this.CREATED_ESTADO;
    obj.createdAt = this.getAt();
    obj.updatedAt = this.getAt();
    return key;
  };

  //Updating
  static override hookUpdating = (
    modifications: any,
    primKey: any,
    obj: any,
    transaction: Transaction,
  ) => {
    const status =
      modifications.status === this.DELETED_ESTADO ? this.DELETED_ESTADO : this.UPDATED_ESTADO;
    return {
      ...modifications,
      ...super.hookUpdating(modifications, primKey, obj, transaction),
      status,
      updatedAt: this.getAt(),
    };
  };
}
