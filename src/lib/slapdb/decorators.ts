/* eslint-disable @typescript-eslint/no-explicit-any */
import { SlapDB } from ".";
import type { Metaclass } from "../utils";
import { type SlapBaseEntity } from "./SlapBaseEntity";

// 1. Decorador de clase para marcar una clase como entidad de la base de datos
export function Entity(syncTableName: string) {
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
        const data = args[0];
        this.initializeMyData(data);
      }
    };
    //4. Definimos el nombre dinámicamente en la propiedad 'name'
    Object.defineProperty(claseEntidadHija, 'name', {
      value: `${constructor.name}_DynEntity`,
      configurable: true
    });
    (claseEntidadHija as any).registrable = true;//Indicamos que esta clase se debe registrar en la base de datos
    (claseEntidadHija as any).registered = false;//Indicamos que esta clase aún no se ha registrado en la base de datos
    if ('syncTableName' in constructor) {
      (constructor as any).syncTableName = syncTableName;
    }//Solo lo agrega si la clase tiene el campo syncTableName, para no agregarlo a las entidades que no lo necesitan
    //5. Registramos la clase hija (con el mismo nombre) para que SlapDB la reconozca
    SlapDB.registerEntity(claseEntidadHija as unknown as Metaclass<typeof SlapBaseEntity>, constructor.name);
    console.log(`Se ha Pre-Registrado la clase: ${constructor.name} (decorador)`);
    return claseEntidadHija;
  }
}
//Decorador de propiedad para marcar un campo como columna de la base de datos
export function Column(target: any, key: string) {
  // Obtenemos o inicializamos la lista de columnas en el prototipo
  const MiClase = target.constructor as SlapBaseEntity;
  MiClase._columns.push(key);

  // Guardamos la lista en el constructor para que sea accesible
  //target.constructor._columns = columns;
}
