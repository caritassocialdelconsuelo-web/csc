export function cuilValidator(cuil: string): boolean {
  if (cuil.length !== 11) {
    return false;
  }

  const [checkDigit, ...rest] = cuil.split('').map(Number).reverse();

  const total = rest.reduce((acc, cur, index) => acc + cur * (2 + (index % 6)), 0);

  const mod11 = 11 - (total % 11);

  if (mod11 === 11) {
    return checkDigit === 0;
  }

  if (mod11 === 10) {
    return false;
  }

  return checkDigit === mod11;
}
export function emailValidator(email: string): boolean {
  const regex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return regex.test(email);
}
export function birthDayValidator(fecha: Date | string): boolean {
  let fechaNac: Date;

  if (typeof fecha === 'string') {
    // Validar formato DD/MM/YYYY
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = fecha.match(regex);
    if (!match) return false;

    // Crear fecha correctamente (DD/MM/YYYY)
    const [, day, month, year] = match;
    fechaNac = new Date(parseInt(year!), parseInt(month!) - 1, parseInt(day!));
  } else {
    fechaNac = fecha;
  }

  // Validar si es una fecha real
  if (isNaN(fechaNac.getTime())) return false;

  const hoy = new Date();

  // Validar que no sea una fecha futura
  if (fechaNac > hoy) return false;

  // Validar edad razonable (no más de 120 años)
  const edadMinima = new Date();
  edadMinima.setFullYear(hoy.getFullYear() - 120);
  if (fechaNac < edadMinima) return false;

  return true;
}
