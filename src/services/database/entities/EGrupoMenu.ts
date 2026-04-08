import { Entity, ManyToOne } from 'src/lib/slapdb/decorators';
import { SlapBaseEntityWithReplycation } from 'src/lib/slapdb/SlapBaseEntityWithReplycation';
import { EGrupo } from './EGrupo';
import { EMenu } from './EMenu';

@Entity('GrupoMenu', 'TGrupoMenu')
export class EGrupoMenu extends SlapBaseEntityWithReplycation {
  @ManyToOne(() => EMenu, (menu) => menu.id)
  menu!: Promise<EMenu | string | undefined>;
  @ManyToOne(() => EGrupo, (grupo) => grupo.id)
  grupo!: Promise<EGrupo | string | undefined>;
}
