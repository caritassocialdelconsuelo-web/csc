import { addRxPlugin, createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import type { MyDatabase, MyDatabaseCollections } from './database';
// eslint-disable-next-line
import {
  heroCollectionMethods,
  heroDocMethods,
  HeroDocument,
  heroPostInsertHook,
  heroSchema,
} from './schemas/hero';

if (import.meta.env.NODE_ENV == 'DEV') {
  const { RxDBDevModePlugin } = await import('rxdb/plugins/dev-mode');
  addRxPlugin(RxDBDevModePlugin);
}

/**
 * create database and collections
 */
const myDatabase: MyDatabase = await createRxDatabase<MyDatabaseCollections>({
  name: 'mydb',
  storage: getRxStorageDexie(),
});

await myDatabase.addCollections({
  heroes: {
    schema: heroSchema,
    methods: heroDocMethods,
    statics: heroCollectionMethods,
  },
  prueba: { schema: heroSchema },
});

myDatabase.heroes // add a postInsert-hook
  .postInsert(
    heroPostInsertHook,
    false, // not async
  );

/**
 * use the database
 */

// insert a document
const hero: HeroDocument = await myDatabase.heroes.insert({
  passportId: 'myId',
  firstName: 'piotr',
  lastName: 'potter',
  age: 5,
});

// access a property
console.log(hero.firstName);

// use a orm method
hero.scream('AAH!');

// use a static orm method from the collection
const amount: number = await myDatabase.heroes.countAllDocuments();
console.log(amount);

/**
 * clean up
 */
await myDatabase.destroy();
