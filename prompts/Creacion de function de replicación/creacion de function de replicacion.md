# Creación de function en PostgreSQL de sincronización basado en un sequence único por transacción

## ROL:

1. Tu eres un experto programador
2. Siempre actualizado a la última versión disponible
3. Experto el TypeScript
4. Experto en Vuejs
5. Experto en Quasar
6. Experto en PostgreSQL
7. Experto en Supabase
8. Nunca equivocas, porque tu código siempre está comprobado y libre de errores.
9. Además eres un profesor que puede explicar cada técnica que utiliza y por eso comentas el código en castellano perfectamente para que quede bien documentado.
10. Para todos los ejemplos que das finalmente entregarás código fuente que justifique tu sugerencia.

## OBJETIVO 1

1. Crear una function en PostgreSQL que reciba los siguientes parámetros:
   a. tablename:string
   b. data:JSONB --Un array de objetos JSON--
   c. ultimo checkpoint del cleinte:BIGINT.
   d. forceUpdate:boolean
2. La function debe analizar los datos recibidos y:
   a: detectar que datos son de la entidad que iran en el campo data:JSONB.
   b: detectar que datos son metadatos de la entidad que van en el campo metadata:JSONB.
   c. bloquear la escritura y sincronización para otros clientes (zona de exclusión única) hasta que termine basado en la tablename (obtener el id de la tabla)
   d: definir el chekpoint único para todas las filas en la transacción.
   e: ### Conflictos.
   e.1 SI forceUpdate=false (DEFAULT)
   e.1.a. En los metadatos que viajan del cliente al servidor existirá un valor que indique el valor del checlpoint de la última sincronización de este registro antes del que el cliente cambiara el dato, si es nuevo esto será nulo o undefined.
   e.1.b. Si el registro a actualizar o borrar (mediante deleted=true) que está en la base de datos tiene un checkpoint que es posterior al que trae el registro de su ultima actualización el registro NO se actualiza y se anota en la coleccion de errores con una descripción del fallo (otro usuario actualizó antes).
   e.1.c Si el registro es nuevo, el único tipo de error posible es el de clave duplicada o algún otro tipo de chequeo que el postgreSQL realice.
   e.1.d Todos los errores que no se actualizaron se enviarán al cliente para que este resuelva.
   e.2 SI forceUpdate=true
   e.2.a se actualizarán los datos en todos los casos sin importar el checkpoint existente en la base de datos o el primary key (se pisarán los existentes con los nuevos)
   e.2.b sólo se colectarán errores de otro tipo que resulte de los checks que se realicen en postgreSQL.

3) La function dentro de la zona de exclusión
   a. debe generar el lote a sincronizar (pull al cliente), excluyendo los registros que se pretenden grabar, pero posteriores al checkpoint del cliente enviado como parametro.
   b. al recuperar las filas para actualizar debe convertirlas cada una de ellas en datos planos mezclado los metadatos y datos (que estan en dos JSONB) para que el cliente lo vea como una sola estructura plana.
   c devolver el array de POJOS en formato JSONB y un campo mas que indique el nuevo checkpoint ultimo del cliente.

## OBJETIVO 2

1. Crear la rutina de sincronización en TypeScript para que el cliente llame en el momento en el que el navegador está online y el sitio de supabase está conectado, para iniciar la sincronización.
2. Limitar los paquetes a un número que es pasado por parámetro para que los lotes de actualización no sean masivos. Poner un default de 10 registros y proceder de los más viejos a los más nuevos. Recordar que se almacenan localmente con dexie.
3. sugerir una estrategia para implementar en el cliente que nos permita detectar error de sincronización.
4. Orientar todo a una base de datos reactiva con dexie y de acuerdo a todo lo que estuvimos trabajando con slapDB.
5. Sugiereme como usar el canal real de comunicación que implementa supabase, para que una vez sicronizado el último checkpoint la sincronización se realice en tiempo real de un modo en que el servidor le avise a los clientes suscriptos, hubo cambios en esta abla, chequeen.
