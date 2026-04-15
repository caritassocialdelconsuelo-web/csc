import { Column, Entity } from 'src/lib/slapdb/decorators';
import { SlapBaseEntityWithReplycation } from 'src/lib/slapdb/SlapBaseEntityWithReplycation';
import { cuilValidator, emailValidator, birthDayValidator } from 'src/lib/validators';

export type Sexo = 'M' | 'F';

@Entity('Personas', 'TPersonas')
export class EPersonas extends SlapBaseEntityWithReplycation {
  @Column('data', true, (newval: number) => {
    return newval && newval > 0 ? true : new Error('El DNI debe ser un número positivo');
  })
  dni!: number;

  @Column('data', true, (newval: Sexo) => {
    return newval === 'M' || newval === 'F' ? true : new Error('El sexo debe ser "M" o "F"');
  })
  sexo!: Sexo;

  @Column('data', true, (newval: string) => {
    return newval && newval.trim() !== '' ? true : new Error('El apellido no puede quedar vacío');
  })
  apellido!: string;

  @Column('data', true, (newval: string) => {
    return newval && newval.trim() !== '' ? true : new Error('Los nombres no pueden quedar vacíos');
  })
  nombres!: string;

  @Column('data', true, (newval: number) => {
    return newval && newval > 0 ? true : new Error('El teléfono debe ser un número positivo');
  })
  telefono!: number;

  @Column('data', true, (newval: string) => {
    return newval && newval.trim() !== '' ? true : new Error('La calle no puede quedar vacía');
  })
  calle!: string;

  @Column('data', false)
  altura!: string;

  @Column('data', false)
  pisoydpto!: string;

  @Column('data', true, (newval: string) => {
    return newval && newval.trim() !== '' ? true : new Error('La ciudad no puede quedar vacía');
  })
  ciudad!: string;

  @Column('data', true, (newval: string) => {
    return newval && newval.trim() !== '' ? true : new Error('El país no puede quedar vacío');
  })
  pais!: string;

  @Column('data', true, (newval: Date | string) => {
    if (!newval) {
      return new Error('La fecha de nacimiento es obligatoria');
    }

    return birthDayValidator(newval)
      ? true
      : new Error(
          'La fecha de nacimiento no es válida (debe ser una fecha pasada y la persona no puede tener más de 120 años)',
        );
  })
  fechaNac!: Date;

  @Column('data', false, (newval: string) => {
    if (!newval) return true; // CUIL es opcional
    if (typeof newval !== 'string') {
      return new Error('El CUIL debe ser una cadena de texto');
    }
    if (!/^\d+$/.test(newval)) {
      return new Error('El CUIL debe contener solo dígitos');
    }
    return cuilValidator(newval) ? true : new Error('El CUIL/CUIT no es válido');
  })
  cuil!: string;

  @Column('data', false, (newval: string) => {
    if (!newval) return true; // Email es opcional
    if (typeof newval !== 'string') {
      return new Error('El email debe ser una cadena de texto');
    }
    return emailValidator(newval) ? true : new Error('El email no tiene un formato válido');
  })
  mail!: string;
}
