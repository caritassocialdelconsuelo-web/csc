
//Declaración de la entidad Perfil

import { useSession } from 'src/composables/useSession';
import { Column, Entity } from 'src/lib/slapdb/decorators';
import { SlapBaseEntityWithReplycationCustomGenerateId } from 'src/lib/slapdb/SlapBaseEntityWithReplycationCustomGenerateId';

export type EstadoPerfil = 'activo' | 'inactivo' | 'suspendido';
export type TemaApp = 'light' | 'dark' | 'system';

// 1. Define los tipos literales explícitamente
@Entity('TPerfil')
export class EPerfil extends SlapBaseEntityWithReplycationCustomGenerateId {
  static override schema = `${super.schema} ,username,email,estado`;
  @Column
  username: string = '';
  @Column
  email: string = '';
  @Column
  estado: EstadoPerfil = 'inactivo';
  @Column
  primerNombre: string = '';
  @Column
  apellido: string = '';
  @Column
  avatarUrl: string = '';
  @Column
  cumpleanios: Date = new Date();
  @Column
  idioma: string = 'ES';
  @Column
  tema: TemaApp = 'system';
  @Column
  fechaCreacion: Date = new Date();
  @Column
  ultimoLogin: Date = new Date();
  protected override async generateCustomID() {
    try {
      const { session: { value: session } } = await useSession();
      if (session?.user?.id) {
        return session.user.id;
      } else {
        console.log('No se pudo obtener el userId de la sesión en EPerfil: Sesión o userId no disponible');
        return undefined;
      }
    } catch (error) {
      console.log(`Error al obtener el userId de la sesión en EPerfil:`, error);
      return undefined;
    }
  }



  constructor(data: Partial<EPerfil>) {
    super(data);
  }
}
