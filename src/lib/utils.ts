/* eslint-disable @typescript-eslint/no-unsafe-function-type */

export const isAsync = (fn: Function) =>
  Object.prototype.toString.call(fn) === '[object AsyncFunction]';
