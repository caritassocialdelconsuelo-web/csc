import { SlapBaseEntityWithReplycation } from "./SlapBaseEntityWithReplycation";

//**********************Clase de replicación para SlapDb con generación personalizada de ID
export abstract class SlapBaseEntityWithReplycationCustomGenerateId extends SlapBaseEntityWithReplycation {
  //Funcion asyncrona para generar el ID
  protected abstract generateCustomID(): Promise<string | undefined>
  override async save(): Promise<string | number | undefined> {
    //Aqui necesitamos traer todos los valores asyncronos de la session antes de grabar y guardarlos en el perfil
    if (!this.id) {
      this.id = await this.generateCustomID() || '';
    };
    return await super.save();
  }
}
