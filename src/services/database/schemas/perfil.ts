/* eslint-disable @typescript-eslint/no-explicit-any */
//Declaración de la entidad Perfil

import type { CreatingHookContext, Transaction } from 'dexie';
import { useSession } from 'src/composables/useSession';
import { Column, Entity, SlapBaseEntityWithReplycation } from 'src/lib/slapdb';
export type EstadoPerfil = 'activo' | 'inactivo' | 'suspendido';
export type TemaApp = 'light' | 'dark' | 'system';

// 1. Define los tipos literales explícitamente
@Entity
export class EPerfil extends SlapBaseEntityWithReplycation {
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
  static override hookCreating = async (
    hookContext: CreatingHookContext<any, any>,
    primKey: any,
    obj: any,
    transaction: Transaction,
  ) => {
    try {
      hookContext.onerror = (error) =>
        console.log(`Error en hookCreate() -hookConext- de EPerfil:`, error);
      const {
        session: { value: session },
      } = await useSession();
      if (session) {
        obj.id = session.user.id;
      } else {
        //Si no tiene la session llama al padre
        super.hookCreating(hookContext, primKey, obj, transaction);
      }
    } catch (error) {
      console.log(`Error en hookCreate() de Eperfil:`, error);
    }
  };

  constructor(data: Partial<EPerfil>) {
    super(data);
  }
}
