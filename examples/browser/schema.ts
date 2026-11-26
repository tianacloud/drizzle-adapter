import { sqliteTable, integer, text, blob } from 'drizzle-orm/sqlite-core';

export const notes = sqliteTable('drizzle_notes', {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  done: integer({ mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const values = sqliteTable('drizzle_values', {
  id: text().primaryKey(),
  nullable: text(),
  payload: text({ mode: 'json' }).$type<{ message: string }>(),
  bytes: blob({ mode: 'buffer' }),
  count: blob({ mode: 'bigint' }),
  real: integer(),
});
