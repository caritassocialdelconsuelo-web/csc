import type { RxCollection, RxDocument, RxJsonSchema } from 'rxdb';
import { toTypedRxJsonSchema, type ExtractDocumentTypeFromTypedRxJsonSchema } from 'rxdb';
export const heroSchemaLiteral = {
  title: 'hero schema',
  description: 'describes a human being',
  version: 0,
  keyCompression: true,
  primaryKey: 'passportId',
  type: 'object',
  properties: {
    passportId: {
      type: 'string',
      maxLength: 100, // <- the primary key must have set maxLength
    },
    firstName: {
      type: 'string',
    },
    lastName: {
      type: 'string',
    },
    age: {
      type: 'integer',
    },
  },
  required: ['firstName', 'lastName', 'passportId'],
  indexes: ['firstName'],
} as const; // <- It is important to set 'as const' to preserve the literal type
// eslint-disable-next-line
const HeroSchemaTyped = toTypedRxJsonSchema(heroSchemaLiteral);

// aggregate the document type from the schema
export type HeroDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof HeroSchemaTyped>;

// create the typed RxJsonSchema from the literal typed object.
export const heroSchema: RxJsonSchema<HeroDocType> = heroSchemaLiteral;

export type HeroDocMethods = {
  scream: (v: string) => string;
};

export const heroDocMethods: HeroDocMethods = {
  scream: function (this: HeroDocument, what: string) {
    return this.firstName + ' screams: ' + what.toUpperCase();
  },
};

export type HeroDocument = RxDocument<HeroDocType, HeroDocMethods>;

// we declare one static ORM-method for the collection
export type HeroCollectionMethods = {
  countAllDocuments: () => Promise<number>;
};

export const heroCollectionMethods: HeroCollectionMethods = {
  countAllDocuments: async function (this: HeroCollection) {
    const allDocs = await this.find().exec();
    return allDocs.length;
  },
};

// and then merge all our types
export type HeroCollection = RxCollection<HeroDocType, HeroDocMethods, HeroCollectionMethods>;

export function heroPostInsertHook(
  this: HeroCollection, // own collection is bound to the scope
  docData: HeroDocType, // documents data
  doc: HeroDocument, // RxDocument
) {
  console.log('insert to ' + this.name + '-collection: ' + doc.firstName);
}
