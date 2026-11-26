import { drizzle } from '@tianacloud/drizzle';
import { eq } from 'drizzle-orm';
import { notes } from '../examples/browser/schema.js';

const db = drizzle({ connection: { origin: 'https://example.com', auth: { getAccessToken: async () => 'test' } }, schema: { notes } });
async function check() {
  const rows = await db.select().from(notes).where(eq(notes.id, 1));
  const title: string = rows[0].title;
  const createdAt: Date = rows[0].createdAt;
  const done: boolean = rows[0].done;
  // @ts-expect-error Insert values follow the schema.
  db.insert(notes).values({ title: 42 });
  // @ts-expect-error Unknown columns are not available.
  rows[0].missing;
  await db.transaction(async tx => { await tx.update(notes).set({ done: true }).where(eq(notes.id, 1)); });
  return { title, createdAt, done };
}
void check;
