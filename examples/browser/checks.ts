import { drizzle } from '@tianacloud/drizzle';
import { Buffer } from 'buffer';
import { eq, sql } from 'drizzle-orm';
import { notes, values } from './schema.js';

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

export async function runChecks(connection: Parameters<typeof drizzle>[0]['connection'],
  report: (message: string) => void) {
  const db = drizzle({ connection, schema: { notes, values } });
  const key = crypto.randomUUID();
  const ids: number[] = [];
  try {
    await db.run(sql`CREATE TABLE IF NOT EXISTS drizzle_values (
      id TEXT PRIMARY KEY, nullable TEXT, payload TEXT, bytes BLOB, count BLOB, real INTEGER
    )`);
    const now = new Date();
    const title = `中文 O'Reilly 🚀 ${key}`;
    const [inserted] = await db.insert(notes).values({ title, createdAt: now }).returning();
    ids.push(inserted.id);
    assert(inserted.title === title && inserted.createdAt.getTime() === now.getTime() && inserted.done === false, 'insert / returning / date / boolean');
    const prepared = db.select().from(notes).where(eq(notes.id, sql.placeholder('id'))).prepare();
    assert((await prepared.all({ id: inserted.id }))[0].title === title, 'prepared parameters');
    await db.update(notes).set({ done: true }).where(eq(notes.id, inserted.id));
    assert((await db.query.notes.findFirst({ where: eq(notes.id, inserted.id) }))?.done === true, 'query API');
    report('PASS CRUD, returning, prepared parameters, query API, Unicode, dates and booleans');

    await db.insert(values).values({ id: key, nullable: null, payload: { message: title }, bytes: Buffer.from([0, 127, 255]), count: 9007199254740993n, real: 42 });
    const [typed] = await db.select().from(values).where(eq(values.id, key));
    assert(typed.nullable === null && typed.payload?.message === title && typed.count === 9007199254740993n, 'typed round trip');
    assert(typed.bytes?.[2] === 255 && typed.real === 42, 'binary round trip');
    report('PASS null, JSON, BLOB and bigint round trips');

    await db.transaction(async (tx) => {
      await tx.update(notes).set({ title: 'committed' }).where(eq(notes.id, inserted.id));
      const [row] = await tx.select().from(notes).where(eq(notes.id, inserted.id));
      assert(row.title === 'committed', 'read your writes');
      await tx.transaction(async (nested) => {
        await nested.update(notes).set({ title: 'nested' }).where(eq(notes.id, inserted.id));
      });
    });
    assert((await prepared.all({ id: inserted.id }))[0].title === 'nested', 'transaction commit');
    report('PASS interactive transaction, read your writes and nested commit');

    const rollback = new Error('intentional rollback');
    try {
      await db.transaction(async (tx) => {
        await tx.update(notes).set({ title: 'rolled back' }).where(eq(notes.id, inserted.id));
        throw rollback;
      });
      throw new Error('rollback did not throw');
    } catch (error) { assert(error === rollback, 'transaction error preserved'); }
    assert((await prepared.all({ id: inserted.id }))[0].title === 'nested', 'transaction rollback');
    await db.transaction(async (tx) => {
      try {
        await tx.transaction(async (nested) => {
          await nested.update(notes).set({ title: 'savepoint rollback' }).where(eq(notes.id, inserted.id));
          throw rollback;
        });
      } catch (error) { assert(error === rollback, 'nested error preserved'); }
      const [row] = await tx.select().from(notes).where(eq(notes.id, inserted.id));
      assert(row.title === 'nested', 'savepoint rollback');
    });
    report('PASS transaction and nested savepoint rollback');

    const batch = await db.batch([
      db.update(notes).set({ title: 'batch' }).where(eq(notes.id, inserted.id)).returning(),
      db.select().from(notes).where(eq(notes.id, inserted.id)),
    ]);
    assert(batch[0][0].title === 'batch' && batch[1][0].title === 'batch', 'batch results');
    try {
      await db.batch([
        db.update(notes).set({ title: 'failed batch' }).where(eq(notes.id, inserted.id)),
        db.insert(notes).values({ id: inserted.id, title: 'duplicate', createdAt: now }),
      ]);
      throw new Error('expected unique constraint');
    } catch (error) { assert(String(error).includes('UNIQUE'), 'SQL error preserved'); }
    assert((await prepared.all({ id: inserted.id }))[0].title === 'batch', 'batch atomicity');
    report('PASS batch execution, atomic rollback and SQL errors');

    const concurrent = await Promise.all(Array.from({ length: 4 }, () => prepared.all({ id: inserted.id })));
    assert(concurrent.every((rows) => rows[0].title === 'batch'), 'concurrent reads');
    const second = drizzle({ connection, schema: { notes } });
    try {
      assert((await second.select().from(notes).where(eq(notes.id, inserted.id)))[0].title === 'batch', 'independent client persistence');
    } finally { second.$client.close(); }
    report('PASS concurrent reads and independent client persistence');
  } finally {
    for (const id of ids) await db.delete(notes).where(eq(notes.id, id));
    await db.delete(values).where(eq(values.id, key));
    db.$client.close();
  }
}
