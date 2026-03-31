import { Column, Entity, OneToMany } from 'src/lib/slapdb/decorators';
import { References } from 'src/lib/slapdb/fk';
import { SlapBaseEntityWithReplycation } from 'src/lib/slapdb/SlapBaseEntityWithReplycation';
import { EUsuarioGrupo } from './EUsuarioGrupo';

@Entity('Grupo', 'TGrupo')
export class EGrupo extends SlapBaseEntityWithReplycation {
  @Column('data', true, (newval: string) => {
    return newval && newval !== ''
      ? true
      : new Error('El valor del nombre del grupo no puede quedar vacio');
  })
  nombre!: string;
  @OneToMany(() => EUsuarioGrupo, (usuarios) => usuarios.grupo, { referenceFieldName: 'grupo' })
  usuarios!: References<EUsuarioGrupo>;
}
