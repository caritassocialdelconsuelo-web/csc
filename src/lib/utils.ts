/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */

export const isAsync = (fn: Function) =>
  Object.prototype.toString.call(fn) === '[object AsyncFunction]';
export const awaiting = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
export type Metaclass<C extends new (...args: any[]) => any> = C
export type StaticOf<T> = T extends new (...args: any[]) => infer R ? R : never;
