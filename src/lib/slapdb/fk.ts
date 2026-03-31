/* eslint-disable @typescript-eslint/no-explicit-any */
import { watch } from 'vue';
import { SlapBaseEntity } from './SlapBaseEntity';
import type { IColumnDescriptor } from './SlapTypes';
import type { Observer } from 'dexie';

//Clase para manejar el array de registros de la clase hija relacionados con esta clase padre.
export class References<T extends SlapBaseEntity> extends Array<T> {
  _field: IColumnDescriptor;
  _thisMain: SlapBaseEntity;
  constructor(field: IColumnDescriptor, obj: SlapBaseEntity) {
    super();
    this._field = field;
    this._thisMain = obj;
    if (
      this._field.funcToChildClass &&
      this._field.funcFieldReference &&
      this._field.options?.referenceFieldName &&
      this._thisMain
    ) {
      const myClass = this._field.funcToChildClass();

      const { setNewParams, $observer } = myClass.getLiveQueryWithParams$<SlapBaseEntity>(
        { id: this._thisMain.id || '' },
        (
          params, //Recibe parametros
        ) =>
          myClass.table
            .where(
              this._field.options?.referenceFieldName ||
              `id${(this._thisMain.constructor as unknown as typeof SlapBaseEntity)._composeConfiguration.schemaInfo.entityName}`,
            )
            .equals(params.id || '')
            .toArray(),
      );
      watch(
        this._thisMain.refAssociatedData, //Vigila el cambio de los datos del refAssociatedData por si cambia la clave en el objeto principal.
        (value: any, oldValue: any) => {
          if (value.id !== oldValue.id) {
            setNewParams({ id: value.id });
          }
        },
      );
      $observer.subscribe({
        next: (childs: T[]) => {
          if (childs !== null) {
            const newArray: T[] = [
              ...this.filter(
                (e) => !e.id || (e.id && childs.filter((e1) => e.id === e1.id).length === 0),
              ),
              ...childs,
            ];
            this.length = 0;
            this.push(...newArray);
          }
        },
        error: (error: any) => {
          this.length = 0;
          console.log(
            `Error en el observer de un references=> clase Padre:${this._thisMain.constructor.name} clase hija ${myClass.name} con error :`,
            error,
          );
        },
      } as Observer<SlapBaseEntity[]>);
      return new Proxy(this, {
        set(target, prop, value, receiver) {
          // Interceptamos si la propiedad es un índice numérico
          if (typeof prop === 'string' && !isNaN(Number(prop))) {
            console.log(`> Intentando asignar ${value} en el índice ${prop}`);
            if (!(value instanceof SlapBaseEntity)) {
              return false;
            } else {
              const refFieldName =
                target._field.options?.referenceFieldName ||
                `id${(target._thisMain.constructor as unknown as typeof SlapBaseEntity)._configuration.schemaInfo.entityName}`;
              if (refFieldName in value) {
                value[refFieldName] = target._thisMain['id'];
              }
            }
          }
          // Ejecuta la asignación normal del Array
          return Reflect.set(target, prop, value, receiver);
        },

        get(target, prop, receiver) {
          if (typeof prop === 'string' && !isNaN(Number(prop))) {
            console.log(`> Accediendo al índice ${prop}`);
          }
          return Reflect.get(target, prop, receiver);
        },
      });
    }
  }
  create() {
    if (this._field.funcToChildClass) {
      const myClass = this._field.funcToChildClass();
      const obj = new myClass();
      this.push(obj as unknown as any);
      return obj;
    }
  }
}
