//Declaración de la entidad Perfil
import type { RxCollection, RxDocument, RxJsonSchema } from 'rxdb';
import { toTypedRxJsonSchema, type ExtractDocumentTypeFromTypedRxJsonSchema } from 'rxdb';

export const slPerfil = {
  title: 'Perfil Entity ',
  description: 'Entidad Perfil',
  version: 0,
  keyCompression: true,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    username: {
      type: 'string',
      minLength: 3,
      maxLength: 120,
    },
    email: {
      type: 'string',
      format: 'email',
    },
    estado: {
      type: 'string',
      enum: ['active', 'inactive', 'suspended'],
    },
    primerNombre: {
      type: 'string',
    },
    apellido: {
      type: 'string',
    },
    avatarUrl: {
      type: 'string',
    },
    cumpleanios: {
      type: 'string',
    },
    idioma: {
      type: 'string',
      maxLength: 2,
    },
    tema: {
      type: 'string',
      enum: ['light', 'dark', 'system'],
    },
    fechaCreacion: {
      type: 'string',
    },
    ultimoLogin: {
      type: 'string',
    },
    _modified: {
      type: 'string',
    },
    _deleted: {
      type: 'boolean',
    },
  },
  required: ['id', 'username', 'email', 'estado', 'primerNombre', 'apellido'], // Apellido añadido
  indexes: ['username', 'email', '_modified'],
} as const;

// eslint-disable-next-line
const STPerfil = toTypedRxJsonSchema(slPerfil);

// aggregate the document type from the schema
export type DTPerfil = ExtractDocumentTypeFromTypedRxJsonSchema<typeof STPerfil>;

// create the typed RxJsonSchema from the literal typed object.
export const jsPerfil: RxJsonSchema<DTPerfil> = slPerfil;

export type DMPerfil = {
  getFullName(): string;
};

export const dmPerfil: DMPerfil = {
  getFullName: function (this: DRxPerfil) {
    return `${this.primerNombre} ${this.apellido}`.trim();
  },
};

export type DRxPerfil = RxDocument<DTPerfil, DMPerfil>;

// we declare one static ORM-method for the collection
export type CMPerfil = {
  findByUsername(username: string): Promise<DRxPerfil | null>;
};

export const cmPerfil: CMPerfil = {
  findByUsername: async function (this: CTPerfil, username: string) {
    return await this.findOne({
      selector: { username },
    }).exec();
  },
};

// and then merge all our types
export type CTPerfil = RxCollection<DTPerfil, DMPerfil, CMPerfil>;

export function postInsertPerfilHook(this: CTPerfil, docData: DTPerfil, doc: DRxPerfil) {
  console.log('insert to ' + this.name + '-collection: ' + doc.id);
}

export function postCreatePerfilHook(this: CTPerfil, docData: DTPerfil, doc: DRxPerfil) {
  console.log('create to ' + this.name + '-collection: ' + doc.id);
}

export function postRemovePerfilHook(this: CTPerfil, docData: DTPerfil, doc: DRxPerfil) {
  console.log('Remove to ' + this.name + '-collection: ' + doc.id);
}

export function postSavePerfilHook(this: CTPerfil, docData: DTPerfil, doc: DRxPerfil) {
  console.log('Save to ' + this.name + '-collection: ' + doc.id);
}

export function preInsertPerfilHook(docData: DTPerfil, instance: RxCollection<DTPerfil, DMPerfil>) {
  console.log('Pre Insert to ' + instance.name + '-collection: ' + docData.id);
}

export function preRemovePerfilHook(this: CTPerfil, docData: DTPerfil, doc: DRxPerfil) {
  console.log('Pre Remove to ' + this.name + '-collection: ' + doc.id);
}

export function preSavePerfilHook(this: CTPerfil, docData: DTPerfil, doc: DRxPerfil) {
  console.log('Pre Save to ' + this.name + '-collection: ' + doc.id);
}

export function registerPerfilHooks(objPerfilColl: CTPerfil) {
  objPerfilColl.postInsert(postInsertPerfilHook, false);
  objPerfilColl.postCreate(postCreatePerfilHook);
  objPerfilColl.postRemove(postRemovePerfilHook, false);
  objPerfilColl.postSave(postSavePerfilHook, false);
  objPerfilColl.preInsert(preInsertPerfilHook, false);
  objPerfilColl.preRemove(preRemovePerfilHook, false);
  objPerfilColl.preSave(preSavePerfilHook, false);
}
