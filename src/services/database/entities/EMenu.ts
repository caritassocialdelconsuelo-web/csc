import { Column, Entity, ManyToOne, OneToMany } from 'src/lib/slapdb/decorators';
import { References } from 'src/lib/slapdb/fk';
import { SlapBaseEntityWithReplycation } from 'src/lib/slapdb/SlapBaseEntityWithReplycation';
import { EGrupoMenu } from './EGrupoMenu';

@Entity('Menu', 'TMenu')
export class EMenu extends SlapBaseEntityWithReplycation {
  @Column('data', true, (newval: string) => {
    return newval && newval !== ''
      ? true
      : new Error('El valor del titulo del menú no puede quedar vacio');
  })
  title!: string;

  @Column('data', false, (newval: string) => {
    return newval && newval !== ''
      ? true
      : new Error('El valor del caption del menú no puede quedar vacio');
  })
  caption!: string;

  @Column('data', false, (newval: string) => {
    return newval && newval !== ''
      ? true
      : new Error('El valor del icon del menú no puede quedar vacio');
  })
  icon!: string;

  @Column('data', false)
  link!: string;

  @Column('data', false)
  to!: string;

  @ManyToOne(() => EMenu, (mnuMadre) => mnuMadre.id)
  menuMadre!: Promise<EMenu> | EMenu | string | undefined;

  @OneToMany(() => EMenu, (mnuHijo) => mnuHijo.menuMadre, {
    referenceFieldName: 'menuMadre',
    cascadeDelete: false,
  })
  menusHijos!: References<EMenu>;

  @OneToMany(() => EGrupoMenu, (gruposMenu) => gruposMenu.menu, { referenceFieldName: 'menu' })
  grupos!: References<EGrupoMenu>;
}
