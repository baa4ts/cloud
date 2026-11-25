# Instalación y configuración del backend

Backend desarrollado con Express, TypeScript, Prisma ORM, Cloudflare Workers, D1 y Durable Objects para WebSocket.

## 1. Instalar dependencias

```bash
pnpm install
pnpm approve-builds --all
```

El script `postinstall` genera automáticamente los tipos de Wrangler y el cliente de Prisma si los scripts de instalación están habilitados.

Aprobar todas las compilaciones únicamente si se confía en las dependencias del proyecto.

## 2. Iniciar sesión en Cloudflare

```bash
pnpm exec wrangler login
```

Se abrirá el navegador para iniciar sesión con la cuenta de Cloudflare y autorizar el acceso.

## 3. Crear la base de datos D1

```bash
pnpm exec wrangler d1 create cloud-db
```

Durante la creación aparecerán las siguientes opciones:

```text
Would you like Wrangler to add it on your behalf?
Yes

What binding name would you like to use?
cloud_db

For local dev, do you want to connect to the remote resource instead of a local resource?
Yes
```

Al seleccionar **Yes en ambas preguntas** y utilizar `cloud_db` como nombre del binding, Wrangler agregará automáticamente la configuración de la base de datos al archivo `wrangler.jsonc`.

## 4. Configurar las migraciones

Una vez creada la base de datos, abrir el archivo `./wrangler.jsonc`.

Si se seleccionó **Yes en ambas preguntas**, solamente falta agregar la siguiente propiedad dentro de la configuración de la base de datos:

```json
"migrations_dir": "prisma/migrations"
```

La configuración debe quedar de la siguiente manera:

```json
"d1_databases": [
  {
    "binding": "cloud_db",
    "database_name": "cloud-db",
    "database_id": "ID_GENERADO_AUTOMATICAMENTE",
    "remote": true,
    "migrations_dir": "prisma/migrations"
  }
]
```

El identificador es generado automáticamente por Cloudflare y será diferente para cada base de datos.

Verificar que no existan bindings duplicados ni quede configurado el identificador de la base de datos anterior.

## 5. Aplicar las migraciones existentes

La base de datos recién creada estará vacía, sin las tablas ni los registros del proyecto original.

Para crear las tablas, ejecutar:

```bash
pnpm exec wrangler d1 migrations apply cloud-db --remote
```

Confirmar seleccionando **Yes**.

Las migraciones se encuentran en:

```text
prisma/migrations/
```

No es necesario inicializar Prisma nuevamente ni crear nuevas migraciones durante la instalación inicial.

Cada desarrollador tendrá su propia base de datos, con la misma estructura, pero sin los registros de otros desarrolladores.

## 6. Generar los tipos y el cliente Prisma

```bash
pnpm exec wrangler types
pnpm exec prisma generate
```

Estos comandos generan los siguientes archivos:

```text
worker-configuration.d.ts
src/generated/prisma/
```

## 7. Verificar TypeScript

```bash
pnpm check
```

## 8. Ejecutar el proyecto

```bash
pnpm dev
```

El servidor estará disponible en:

```text
http://localhost:8787
```

## 9. Probar la API

### Listar usuarios (GET)

```cmd
curl http://localhost:8787/usuarios
```

### Crear usuario (POST)

```cmd
curl -X POST http://localhost:8787/usuarios -H "Content-Type: application/json" -d "{\"nombre\":\"Juan\",\"email\":\"juan@example.com\"}"
```

### Probar WebSocket

Abrir otra terminal y ejecutar:

```bash
pnpm dlx wscat -c ws://localhost:8787/ws
```

Al crear un usuario mediante POST, se recibirá automáticamente una notificación con el evento `usuario_creado`.

---

# Modificaciones en la base de datos

Cuando se necesite agregar, modificar o eliminar tablas, campos o relaciones, se deberá crear una nueva migración.

## 1. Modificar el esquema de Prisma

Abrir el archivo:

```text
prisma/schema.prisma
```

Por ejemplo, si queremos agregar el campo `telefono` a la tabla `Usuario`:

```prisma
model Usuario {
    id        Int      @id @default(autoincrement())
    nombre    String
    email     String   @unique
    telefono  String?
    creado_en DateTime @default(now())
}
```

El signo `?` indica que el campo es opcional.

## 2. Validar el esquema

```bash
pnpm exec prisma validate
```

## 3. Crear una nueva migración

```bash
pnpm exec wrangler d1 migrations create cloud-db agregar_telefono
```

Se generará un nuevo archivo dentro de:

```text
prisma/migrations/0002_agregar_telefono.sql
```

La numeración dependerá de las migraciones existentes.

## 4. Generar las sentencias SQL

Para una modificación sencilla, como agregar un campo, se puede escribir directamente el SQL en el archivo de la nueva migración:

```sql
ALTER TABLE "Usuario" ADD COLUMN "telefono" TEXT;
```

También se puede utilizar Prisma para generar las diferencias automáticamente.

Para ello, se necesita conservar una copia del esquema anterior a la modificación, por ejemplo:

```text
prisma/schema-anterior.prisma
```

Ejecutar:

```bash
pnpm exec prisma migrate diff --from-schema prisma/schema-anterior.prisma --to-schema prisma/schema.prisma --script --output prisma/migrations/0002_agregar_telefono.sql
```

Revisar el SQL generado antes de aplicar la migración. Una vez finalizado el procedimiento, la copia del esquema anterior puede eliminarse.

## 5. Aplicar la nueva migración

```bash
pnpm exec wrangler d1 migrations apply cloud-db --remote
```

Confirmar seleccionando **Yes**.

Wrangler solamente aplicará las migraciones que todavía no hayan sido ejecutadas.

## 6. Regenerar el cliente de Prisma

```bash
pnpm exec prisma generate
```

Este paso es necesario para que TypeScript y Prisma reconozcan los nuevos campos, tablas o relaciones.

## 7. Verificar los cambios

```bash
pnpm check
pnpm dev
```

Para verificar la estructura de la tabla directamente en D1:

```bash
pnpm exec wrangler d1 execute cloud-db --remote --command "PRAGMA table_info('Usuario');"
```

## 8. Consultar el estado de las migraciones

```bash
pnpm exec wrangler d1 migrations list cloud-db --remote
```

---

# Actualizar la base de datos cuando otro desarrollador realiza cambios

Si otro integrante del equipo agrega nuevas migraciones al repositorio, después de descargar los cambios deberá ejecutar:

```bash
pnpm install
pnpm exec wrangler d1 migrations apply cloud-db --remote
pnpm exec prisma generate
pnpm exec wrangler types
pnpm check
pnpm dev
```

No es necesario eliminar ni volver a crear la base de datos.

---

# Despliegue en Cloudflare

Antes de realizar el despliegue, verificar que todas las migraciones estén aplicadas:

```bash
pnpm exec wrangler d1 migrations apply cloud-db --remote
pnpm exec prisma generate
pnpm check
```

Publicar el backend:

```bash
pnpm deploy
```

Wrangler se encargará de empaquetar el proyecto, desplegar el Worker y registrar los Durable Objects.

Al finalizar, proporcionará la URL pública del backend.

## Consultar los logs de producción

```bash
pnpm exec wrangler tail
```

---

# Comandos principales

| Comando | Descripción |
|---|---|
| `pnpm install` | Instala las dependencias. |
| `pnpm approve-builds --all` | Aprueba las compilaciones pendientes de las dependencias. |
| `pnpm dev` | Ejecuta el servidor local. |
| `pnpm check` | Verifica errores de TypeScript. |
| `pnpm cf-typegen` | Genera los tipos de Wrangler. |
| `pnpm exec prisma generate` | Genera el cliente de Prisma. |
| `pnpm exec prisma validate` | Valida el esquema de Prisma. |
| `pnpm exec wrangler login` | Inicia sesión en Cloudflare. |
| `pnpm exec wrangler d1 list` | Lista las bases de datos D1. |
| `pnpm exec wrangler d1 migrations list cloud-db --remote` | Consulta las migraciones pendientes. |
| `pnpm exec wrangler d1 migrations apply cloud-db --remote` | Aplica las migraciones pendientes. |
| `pnpm deploy` | Publica el backend. |

# Consideraciones importantes

- Cada desarrollador debe utilizar su propia base de datos D1.
- La base de datos nueva no contiene registros del proyecto original.
- No eliminar ni modificar migraciones que ya fueron aplicadas.
- Crear una nueva migración por cada cambio estructural.
- No utilizar `prisma migrate dev` ni `prisma db push` para actualizar directamente Cloudflare D1.
- Regenerar el cliente Prisma después de modificar el esquema.
- Subir al repositorio el esquema de Prisma y todas las migraciones.
- Evitar sobrescribir los identificadores de las bases de datos de otros desarrolladores.
- No es necesario crear manualmente los Durable Objects.
- Con `remote: true`, las operaciones locales afectan directamente a la base de datos remota configurada.
- Realizar una copia de seguridad antes de aplicar migraciones destructivas.
- La API actualmente no cuenta con autenticación y debe utilizarse con datos de prueba.