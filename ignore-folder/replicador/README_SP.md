# rxdb-supabase: Soporte Offline para Supabase

![NPM](https://img.shields.io/npm/l/rxdb-supabase)
![NPM](https://img.shields.io/npm/v/rxdb-supabase)
![GitHub Workflow Status](https://github.com/marceljuenemann/rxdb-supabase/actions/workflows/rxdb-supabase.yml/badge.svg?branch=main)

> [!WARNING]  
> **Actualmente solo se soporta RxDB 14. ¡Está planeado trabajar en el soporte para RxDB 16 próximamente!**

[RxDB](https://rxdb.info/) es una base de datos del lado del cliente, orientada a _offline-first_, que soporta varias capas de almacenamiento incluyendo IndexedDB. [Supabase](https://supabase.com/) es una alternativa de código abierto a Firebase que almacena datos en una base de datos Postgres con seguridad a nivel de fila (RLS). Esta librería utiliza la lógica de replicación de RxDB para habilitar una sincronización bidireccional entre tu base de datos RxDB local y una tabla remota de Supabase, permitiéndote definir estrategias personalizadas de resolución de conflictos.

## Cómo funciona

RxDB es una **base de datos offline-first**, por lo que todas las lecturas y escrituras se realizan contra la base de datos RxDB del cliente, la cual se sincroniza con la tabla de Supabase correspondiente en segundo plano. En otras palabras, almacena una **copia completa de la tabla de Supabase localmente** (específicamente, el subconjunto de filas accesibles al usuario tras aplicar las reglas de seguridad de nivel de fila). Todo se configura por tabla, por lo que podrías habilitar el soporte offline para algunas tablas mientras consultas otras usando el `SupabaseClient` solo cuando estés conectado.

La mayor parte de la replicación y la resolución de conflictos es gestionada por el [protocolo de replicación](https://rxdb.info/replication.html) de RxDB. Funciona de manera similar a Git, descargando siempre todos los cambios de Supabase antes de fusionar los cambios locales y luego subirlos a Supabase. Cuando inicias la replicación, se ejecutan estas tres etapas en orden:

1.  **Pull (Descarga de cambios de Supabase):** Como la tabla de Supabase pudo haber cambiado desde la última sincronización en ese cliente en particular, necesitamos obtener todas las filas que fueron modificadas en el intervalo. Para que esto sea posible, se aplican ciertas restricciones a la tabla que deseas sincronizar:
    - **Campo `_modified`:** Tu tabla necesita un campo con la marca de tiempo (timestamp) de la última modificación.
    - **Campo `_deleted`:** No puedes eliminar filas físicamente de Supabase a menos que estés seguro de que todos los clientes han replicado la eliminación localmente. En su lugar, necesitas un campo booleano que indique si la fila ha sido eliminada; RxDB manejará esto por ti de forma transparente.
2.  **Push (Subida de cambios a Supabase):** A continuación, enviamos consultas `INSERT` y `UPDATE` a Supabase con todas las escrituras locales. Por defecto, las filas solo se actualizan si no han cambiado en el servidor; de lo contrario, se invoca el gestor de conflictos de RxDB.
3.  **Vigilancia de cambios en tiempo real:** Una vez completada la sincronización inicial, utilizamos la función _Realtime_ de Supabase para suscribirnos a cualquier cambio en la tabla. Se recomienda llamar a `reSync()` cuando la app vuelva a estar [en línea](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine#listening_for_changes_in_network_status).

## Guía de Inicio

### Instalar

`npm install rxdb-supabase rxdb @supabase/supabase-js --save`

### Crea tu RxDB

```typescript
import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

const myDatabase = await createRxDatabase({
  name: 'humans',
  storage: getRxStorageDexie(),
});

const mySchema = {
  title: 'human schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    age: { description: 'edad en años', type: 'integer' },
  },
  required: ['id', 'name', 'age'],
  indexes: ['age'],
};

const myCollections = await db.addCollections({
  humans: { schema: mySchema },
});
```
