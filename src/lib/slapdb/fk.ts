/* eslint-disable @typescript-eslint/no-explicit-any */
import { SlapBaseEntity } from './SlapBaseEntity';

export class References<T extends SlapBaseEntity> extends Array<T> {
  _class: { new (...args: any[]): T };
  _fieldName: string;
  _referred: SlapBaseEntity;
  constructor(
    entityReference: { new (...args: any[]): T },
    fieldName: string,
    referred: SlapBaseEntity,
    ...items: T[]
  ) {
    super();
    this.push(...items);
    this._class = entityReference; //Aquí es una clase
    this._fieldName = fieldName;
    this._referred = referred; //Aqui es un objeto al que pertenece esta propiedad de este tipo.
    // Retornamos un Proxy para interceptar el acceso por índice [i]
    return new Proxy(this, {
      set(target, prop, value, receiver) {
        // Interceptamos si la propiedad es un índice numérico
        if (typeof prop === 'string' && !isNaN(Number(prop))) {
          console.log(`> Intentando asignar ${value} en el índice ${prop}`);
          if (!(value instanceof SlapBaseEntity)) {
            return false;
          }
        }
        value[target._fieldName] = target._referred['id'];
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

  createReference() {
    const obj = new this._class();
    (obj as any)[this._fieldName] = this._referred['id'];
  }
}
