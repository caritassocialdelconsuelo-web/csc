/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */

export const isAsync = (fn: Function) =>
  Object.prototype.toString.call(fn) === '[object AsyncFunction]';
export const awaiting = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export type Metaclass<C extends new (...args: any[]) => any> = C;
export type StaticOf<T> = T extends new (...args: any[]) => infer R ? R : never;
export function isSubclass(subClass: any, superClass: any): boolean {
  // Verificación de seguridad
  if (!subClass || !superClass) return false;

  // Comparamos el prototipo de la subclase contra el de la superclase
  // eslint-disable-next-line no-prototype-builtins
  return superClass.prototype.isPrototypeOf(subClass.prototype);
}
export function mergeObjects<T, U>(obj1: T, obj2: U): T & U {
  const output: any = { ...obj1 };
  for (const key in obj2) {
    if (key in output) {
      if (Array.isArray(output[key]) && Array.isArray(obj2[key])) {
        output[key] = [...output[key], ...obj2[key]];
      } else if (typeof output[key] === 'object' && typeof obj2[key] === 'object') {
        output[key] = mergeObjects(output[key], obj2[key]);
      } else {
        output[key] = obj2[key];
      }
    } else {
      output[key] = obj2[key];
    }
  }
  return output;
}
