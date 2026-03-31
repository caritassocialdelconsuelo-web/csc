import { Entity, ManyToOne } from 'src/lib/slapdb/decorators';
import { SlapBaseEntityWithReplycation } from 'src/lib/slapdb/SlapBaseEntityWithReplycation';
import { EPerfil } from './EPerfil';
import { EGrupo } from './EGrupo';

@Entity('UsuarioGrupo', 'TUsuarioGrupo')
export class EUsuarioGrupo extends SlapBaseEntityWithReplycation {
  @ManyToOne(() => EPerfil, (perfil) => perfil.id)
  perfil!: Promise<EPerfil | string | undefined>;
  @ManyToOne(() => EGrupo, (grupo) => grupo.id)
  grupo!: Promise<EPerfil | string | undefined>;
}
