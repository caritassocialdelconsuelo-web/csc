import type { RxDatabase } from 'rxdb';
import type { HeroCollection } from './schemas/hero';

export type MyDatabaseCollections = {
  heroes: HeroCollection;
};

export type MyDatabase = RxDatabase<MyDatabaseCollections>;
