# Drizzle ORM for Tiana SQLite

Use Drizzle's SQLite schemas, queries, relations, prepared queries, batches, and
transactions with Tiana SQLite. Change the database initialization; keep using
`drizzle-orm` for everything else.

## Install

```sh
npm install @tianacloud/drizzle drizzle-orm
```

Requires Node.js 20+ for development or server-side use. Browser applications
should use an ES module bundler. The supported Drizzle release line is 0.45.x
(starting at 0.45.4).

## Browser quick start

In a Tiana Web application or CLI local preview:

```ts
import { drizzle } from '@tianacloud/drizzle';
import { eq } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const notes = sqliteTable('notes', {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
});

const connection = await window.tiana.connection();
const db = drizzle({
  connection: { origin: connection.origin, auth: window.tiana.auth },
  schema: { notes },
});

// Create the table through a migration before running these queries.
const [note] = await db.insert(notes).values({ title: 'Hello, Tiana' }).returning();
const saved = await db.select().from(notes).where(eq(notes.id, note.id));
await db.update(notes).set({ title: 'Updated' }).where(eq(notes.id, note.id));
await db.delete(notes).where(eq(notes.id, note.id));

// Dispose when the application no longer needs this database client.
db.$client.close();
```

The host supplies `window.tiana.connection()` and `window.tiana.auth`; installing
this package does not create that runtime. Keep browser credentials in the host's
auth provider, rather than embedding tokens in application code. For a separately
hosted website, obtain the database origin and auth provider through Tiana's website
authorization flow.

A complete runnable example is in [examples/browser](examples/browser).

## Transactions and batches

```ts
await db.transaction(async (tx) => {
  const [note] = await tx.insert(notes).values({ title: 'Draft' }).returning();
  await tx.update(notes).set({ title: 'Ready' }).where(eq(notes.id, note.id));
});

const results = await db.batch([
  db.insert(notes).values({ title: 'Batch note' }).returning(),
  db.select().from(notes).limit(10),
]);
```

Throwing from the transaction callback rolls back the transaction. Nested
transactions use savepoints. Keep interactive transactions short; a lost or expired
session cannot be resumed by reconnecting. A lost response can leave a write's
outcome unknown: verify the saved state before deciding whether to retry. The
adapter does not add automatic retries.

## Node.js

Keep the database token in your server environment:

```ts
import { drizzle } from '@tianacloud/drizzle';

const db = drizzle({
  connection: {
    origin: process.env.TIANA_DATABASE_ORIGIN!,
    tianaToken: process.env.TIANA_TOKEN!,
  },
});
```

`connection` accepts `origin`, either `auth` or `tianaToken`, and optional
`intMode`, `concurrency`, `fetch`, and `onDiagnostic`. `fetch` is the underlying
network transport. Other configuration, such as `schema` and `logger`, is passed
to Drizzle. The returned database is Drizzle's libSQL database, with its original
`$client` available for lifecycle management and raw driver operations.

## Types and browser BLOB columns

SQLite integers default to JavaScript numbers. The driver rejects integers outside
the safe integer range instead of silently rounding them. For raw driver results,
set `connection.intMode` to `bigint` or `string` when needed and align schema types
with the chosen representation.

Drizzle 0.45.x BLOB column modes use Node's `Buffer` API. If you use `blob()` in a
browser, supply a Buffer polyfill through your bundler. The browser example uses
`buffer` and esbuild's `inject` option so the polyfill is scoped to the bundle;
the adapter does not install globals. Ordinary text, number, boolean, date, and
`text({ mode: 'json' })` columns do not require this polyfill.

## Migrations

Generate SQL with Drizzle Kit using your existing SQLite schema:

```sh
npx drizzle-kit generate --dialect sqlite --schema ./schema.ts --out ./drizzle
```

Apply the generated migrations from Node.js using the connected database:

```ts
import { migrate } from 'drizzle-orm/libsql/migrator';

try {
  await migrate(db, { migrationsFolder: './drizzle' });
} finally {
  db.$client.close();
}
```

Run migrations as an explicit development or deployment step. Schema definitions
alone do not create database tables. Drizzle Kit's direct `push`, `pull`, and
Studio connections do not use this package's initialization function and are not
covered by this integration.

## Development and validation

```sh
npm ci
npm run check
npm pack --dry-run
```

`npm test` covers transport error propagation and absence of automatic replay.
`npm run typecheck` checks schema inference and the example. The browser suite
requires a dedicated real Tiana database and the running example; see its README.
It covers Chromium and mobile WebKit, data types, transactions and rollback,
batches, refresh persistence, CRUD interactions, and offline errors. These live
tests are separate from CI checks and require your own authenticated runtime.

## License

Apache-2.0. Drizzle, libSQL, and other dependencies retain their own licenses.
