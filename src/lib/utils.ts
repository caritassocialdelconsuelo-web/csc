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
