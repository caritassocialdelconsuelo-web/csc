
import { SlapBaseEntity } from './SlapBaseEntity';
import type { IColumnDescriptor } from './SlapTypes';

//Clase para manejar el array de registros de la clase hija relacionados con esta clase padre.
export class References extends Array<SlapBaseEntity> {
  _field: IColumnDescriptor;
  _thisMain: SlapBaseEntity;
  constructor(
    field: IColumnDescriptor, obj: SlapBaseEntity) {
    super();
    this._field = field;
    this._thisMain = obj;
    if (this._field.funcToChildClass && this._field.funcFieldReference && this._field.referenceFieldName && this._thisMain) {
      const myClass = this._field.funcToChildClass();
      myClass.getLiveQuery$(() => myClass._configuration
        .dbstate.table
        .where(this._field.referenceFieldName || `id${(this._thisMain.constructor as unknown as typeof SlapBaseEntity)._configuration.schemaInfo.entityName}`)
        .equals(this._thisMain.id || '').toArray()).subscribe(
          {
            next:
              (childs) => {
                this.length = 0;
                this.push(...childs);
              },
            error: (error) => {
              this.length = 0;
              console.log(`Error en el observer de un references=> clase Padre:${this._thisMain.constructor.name} clase hija ${myClass.name} con error :`, error)
            }
          }
        );
      return new Proxy(this, {
        set(target, prop, value, receiver) {
          // Interceptamos si la propiedad es un índice numérico
          if (typeof prop === 'string' && !isNaN(Number(prop))) {
            console.log(`> Intentando asignar ${value} en el índice ${prop}`);
            if (!(value instanceof SlapBaseEntity)) {
              return false;
            }
          }
          value[target._field.referenceFieldName || `id${(target._thisMain.constructor as unknown as typeof SlapBaseEntity)._configuration.schemaInfo.entityName}`] = target._thisMain['id'];
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
      this.push(obj);
      return obj;
    }
  }
}



export class Referred extends Array<SlapBaseEntity> {
