/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Ref } from 'vue';
import { ref } from 'vue';
import { SlapDB } from '.';
import { type Metaclass } from '../utils';
import { References } from './fk';
import { type SlapBaseEntity } from './SlapBaseEntity';
import type { IConfigSlapEntity, TColumnType, IColumnDescriptor, IFieldRefOptions } from './SlapTypes';

// 1. Decorador de clase para marcar una clase como entidad de la base de datos
export function Entity(entityName: string, syncTableName: string) {
  //console.log(`Decorador @Entity aplicado a la clase: (syncTableName: ${syncTableName})`);
  return function <T extends new (...args: any[]) => SlapBaseEntity>(constructor: T) {
    // 2. Retornar el decorador de clase (recibe el constructor original)
    const claseEntidadHija = class extends constructor {
      constructor(...args: any[]) {
        // 1. Llama al constructor original (Madre + Hija)
        super(...args);

        //Pregunta si en la clase base ya se ha registrado, para no registrar la misma clase varias veces (en caso de que se creen varias instancias de la clase hija)
        //this.getThisClass().checkRegistered()
        // 3. En este punto, los campos de la Hija ya se inicializaron.
        // Si el primer argumento es el objeto 'data', lo aplicamos ahora.
        const data = args.length > 0 ? args[0] : undefined;
        const fromDb = args.length > 1 ? args[1] : false;
        if (data) {
          this.initializeMyData(data);
          this._persisted = fromDb;
          this._newObject = !fromDb;
        }
      }
    };
    //4. Definimos el nombre dinámicamente en la propiedad 'name'
    Object.defineProperty(claseEntidadHija, 'name', {
      value: `${entityName}_DynEntity`,
      configurable: true,
    });
    (claseEntidadHija as any)._configuration.dbstate.registrable = true; //Indicamos que esta clase se debe registrar en la base de datos
    (claseEntidadHija as any)._configuration.dbstate.registered = false; //Indicamos que esta clase aún no se ha registrado en la base de datos
    (constructor as unknown as SlapBaseEntity)._configuration.dbstate.syncTableName = syncTableName;
    (constructor as unknown as SlapBaseEntity)._configuration.schemaInfo.entityName = entityName;
    //if ('syncTableName' in constructor) {
    //  (constructor as any).syncTableName = syncTableName;
    //} //Solo lo agrega si la clase tiene el campo entityName, para no agregarlo a las entidades que no lo necesitan
    //if ('entityName' in constructor) {
    //  (constructor as any).entityName = entityName;
    //}

    //5. Registramos la clase hija (con el mismo nombre) para que SlapDB la reconozca
    SlapDB.registerEntity(
      claseEntidadHija as unknown as Metaclass<typeof SlapBaseEntity>,
      entityName,
    );
    console.log(
      `Se ha Pre-Registrado la clase de la entidad ${entityName}: clase-> ${constructor.name} (decorador)`,
    );
    return claseEntidadHija;
  };
}
//Decorador de propiedad para marcar un campo como columna de la base de datos
export function Column(
  tipo: TColumnType = 'data',
  indexed: boolean = false,
  func?:
    | ((newVal: any, oldVal: any, obj: SlapBaseEntity) => Error | boolean)
    | ((obj: SlapBaseEntity) => any),
) {
  return function (target: any, key: string) {
    // Obtenemos o inicializamos la lista de columnas en el prototipo
    const MiClase = target.constructor;
    const config = MiClase._configuration as IConfigSlapEntity;
    const field: IColumnDescriptor = {
      name: key,
      indexed: indexed,
      tipo: tipo,
    };
    if (tipo === 'data') {
      config.schemaInfo.columns[key] = field;
    } else if (tipo === 'metadata') {
      config.schemaInfo.metadataColumns[key] = field;
    } else if (tipo === 'key') {
      config.schemaInfo.keyColumns[key] = field;
      config.schemaInfo.indexedColumns[key] = key;
    } else if (tipo === 'system') {
      //Las columnas de tipo 'system' son columnas especiales que no se guardan en la base de datos, pero que se pueden usar para almacenar información adicional en la instancia, como por ejemplo el estado de sincronización, o el ID de la sesión que creó o modificó el registro, etc. Estas columnas no se incluyen en los métodos de guardado ni en los métodos de obtención de datos, pero sí están disponibles en la instancia para su uso interno.
      config.schemaInfo.systemColumns[key] = field;
    }
    if (indexed && tipo !== 'key') {
      //Si la columna se marca como indexada y no es de tipo 'key', la agregamos a la lista de columnas indexadas
      config.schemaInfo.indexedColumns[key] = key;
    }
    delete target[key];
    Object.defineProperty(target, key, {
      get() {
        if (tipo === 'computed') {
          if (func) {
            const res = (func as (obj: SlapBaseEntity) => any)(this);
            return res;
          }
        } else {
          return this.getField(key);
        }
      },
      set(newVal: any) {
        let res: any = true;
        if (func) {
          res = func(newVal, this[key], this);
        }
        if (typeof res == 'boolean') {
          if (res) {
            this.setField(key, newVal);
          } else {
            throw Error('No se ha podido actualizar porque fallaron las reglas de validación');
          }
        } else {
          throw res;
        }
      },
      enumerable: true,
      configurable: false,
    });
  };
}

export function OneToMany(
  funcToChildClass: () => typeof SlapBaseEntity,
  funcFieldReference: (children: SlapBaseEntity) => any, options: IFieldRefOptions = { referenceFieldName: null, cascadeDelete: false },
) {
  return function (target: any, key: string) {
    const MiClase = target.constructor;
    const config = MiClase._configuration as IConfigSlapEntity;
    const field: IColumnDescriptor = {
      name: key,
      indexed: false,
      tipo: 'reference',
      funcToChildClass,
      funcFieldReference,
      options,
    };
    config.schemaInfo.referenceColumns[key] = field;
    delete target[key];
    const fieldName = `_${key}_refArray`;
    Object.defineProperty(target, key, {
      get() {
        if (!this[fieldName]) {
          this[fieldName] = new References(field, this);
        }
        return this[fieldName];
      }, //Los campos de referencia hijas son computados.
      enumerable: true,
      configurable: false,
    });
  };
}

export function ManyToOne(
  funcToMainClass: () => typeof SlapBaseEntity,
  funcFieldReferred: (main: SlapBaseEntity) => any,
) {
  return function (target: any, key: string) {
    const MiClase = target.constructor;
    const config = MiClase._configuration as IConfigSlapEntity;
    const field: IColumnDescriptor = {
      name: key,
      indexed: false,
      tipo: 'referred',
      funcToMainClass,
      funcFieldReferred,
    };
    config.schemaInfo.referredColumns[key] = field;
    config.schemaInfo.indexedColumns[key] = key;
    delete target[key];
    const fieldName = `_${key}_refObject`;
    Object.defineProperty(target, key, {
      get(): Promise<Ref<SlapBaseEntity | undefined> | string> {
        if (!(fieldName in this)) {
          this[fieldName] = ref();
        }
        const referred = this[fieldName];
        if (referred.value) {
          return Promise.resolve(referred);
        }
        const keyReferred = this.getField(key);
        try {
          if (funcToMainClass) {
            return funcToMainClass()
              .get(keyReferred)
              .then((obj) => {
                if (obj) {
                  referred.value = obj;
                  return referred;
                } else {
                  return keyReferred;
                }
              })
              .catch((error) => {
                console.log(
                  `Error en un campo referido en ${target.name} campo:${key} con el error:`,
                  error,
                );
                return keyReferred;
              });
          }
        } catch (error) {
          console.log(
            `Error en un campo referido en ${target.name} campo:${key} con el error:`,
            error,
          );
        }
        return Promise.resolve(keyReferred);
      },
      set(newVal: any) {
        if (!(fieldName in this)) {
          this[fieldName] = ref();
        }
        const keyReferred = this.getField(key);
        if (typeof newVal !== 'string' && newVal) {
          this[fieldName].value = newVal;
          newVal = funcFieldReferred ? funcFieldReferred(newVal) : newVal.id; //Dependiendo de si newVal es un string o es un objeto va a intentar recuperar el valor clave.
        } else {
          if (newVal !== keyReferred) {
            this[fieldName].value = undefined;
          }
        }
        if (newVal !== keyReferred) {
          this.setField(key, newVal);
        }
      },
      //Los campos de referencia hijas son computados.
      enumerable: true,
      configurable: false,
    });
  };
}
