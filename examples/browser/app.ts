import { drizzle } from '@tianacloud/drizzle';
import { desc, eq, sql } from 'drizzle-orm';
import { notes } from './schema.js';
import { runChecks } from './checks.js';
import type { TianaAuthProvider } from '@tianacloud/serverless';

declare global {
  interface Window {
    tiana: { connection(): Promise<{ origin: string }>; auth: TianaAuthProvider };
  }
}

export async function mount(root: HTMLElement) {
  root.innerHTML = `<style>
    *{box-sizing:border-box}body{margin:0;background:#f7f7f5;color:#202322;font:16px system-ui,sans-serif}
    main{max-width:760px;margin:48px auto;padding:24px}h1{font-size:32px;letter-spacing:-1px}
    input,button{font:inherit;padding:10px 14px;border:1px solid #aaa;border-radius:6px}button{cursor:pointer;background:white}
    button:disabled{opacity:.5;cursor:wait}form{display:flex;gap:12px;margin:28px 0}input{min-width:0;flex:1}
    li{display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid #ddd}li span{flex:1;overflow-wrap:anywhere}
    ul{list-style:none;padding:0}pre{white-space:pre-wrap;font-size:13px;line-height:1.7}#status{min-height:24px}small{color:#626762}
    @media(max-width:480px){main{margin:12px auto;padding:20px}form{flex-wrap:wrap}}
  </style><main><small>TIANA SQLITE + DRIZZLE ORM</small><h1>Notes</h1>
  <p>Add a note, mark it done, then reload to check that it is saved.</p>
  <p id="status" role="status">Connecting…</p>
  <form><input name="title" aria-label="Note" placeholder="Write a note" required><button>Add note</button></form>
  <ul aria-label="Notes"></ul><button id="checks">Run database checks</button><pre id="results" aria-live="polite"></pre></main>`;
  const status = root.querySelector<HTMLElement>('#status')!;
  const connection = { origin: (await window.tiana.connection()).origin, auth: window.tiana.auth };
  const db = drizzle({ connection, schema: { notes } });
  await db.run(sql`CREATE TABLE IF NOT EXISTS drizzle_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
  )`);
  const list = root.querySelector('ul')!;
  async function reload() {
    const rows = await db.select().from(notes).orderBy(desc(notes.id)).limit(50);
    list.replaceChildren();
    for (const note of rows) {
      const row = document.createElement('li');
      const title = document.createElement('span');
      title.textContent = note.title;
      title.style.textDecoration = note.done ? 'line-through' : '';
      const toggle = document.createElement('button');
      toggle.textContent = note.done ? 'Undo' : 'Done';
      toggle.onclick = () => action(async () => {
        await db.update(notes).set({ done: !note.done }).where(eq(notes.id, note.id));
        await reload();
      });
      const remove = document.createElement('button');
      remove.textContent = 'Delete';
      remove.onclick = () => action(async () => { await db.delete(notes).where(eq(notes.id, note.id)); await reload(); });
      row.append(title, toggle, remove); list.append(row);
    }
  }
  async function action(fn: () => Promise<void>) {
    const buttons = root.querySelectorAll('button'); buttons.forEach(b => b.disabled = true);
    status.textContent = 'Working…';
    try { await fn(); status.textContent = 'Saved'; }
    catch (error) { status.textContent = `Operation failed. Refresh to check the saved state before retrying. ${String(error)}`; }
    finally { buttons.forEach(b => b.disabled = false); }
  }
  root.querySelector('form')!.onsubmit = (event) => {
    event.preventDefault();
    const input = root.querySelector<HTMLInputElement>('input')!;
    void action(async () => {
      await db.insert(notes).values({ title: input.value, createdAt: new Date() });
      input.value = ''; await reload();
    });
  };
  root.querySelector<HTMLButtonElement>('#checks')!.onclick = () => action(async () => {
    const results = root.querySelector('#results')!; results.textContent = '';
    await runChecks(connection, message => { results.textContent += message + '\n'; });
    results.textContent += 'All database checks passed.\n'; await reload();
  });
  await reload(); status.textContent = 'Connected';
  window.addEventListener('pagehide', () => db.$client.close(), { once: true });
}
