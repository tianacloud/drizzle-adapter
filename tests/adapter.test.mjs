import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sql } from 'drizzle-orm';
import { drizzle } from '../dist/index.js';

function hasMessage(error, message) {
  return Boolean(error && (String(error.message).includes(message) || hasMessage(error.cause, message)));
}

const origin = 'https://ep-00000000000000000000000000.example.com';

test('construction performs no network or credential lookup', () => {
  let calls = 0;
  const db = drizzle({ connection: { origin, auth: { getAccessToken: async () => { calls++; return 'test-token'; } }, fetch: async () => { calls++; throw new Error('unexpected'); } } });
  assert.equal(calls, 0);
  db.$client.close();
});

test('credential failure prevents the database request', async () => {
  let requests = 0;
  const db = drizzle({ connection: { origin, auth: { getAccessToken: async () => { throw new Error('login required'); } }, fetch: async () => { requests++; throw new Error('unexpected'); } } });
  try {
    await assert.rejects(db.run(sql`select 1`), error => hasMessage(error, 'login required'));
    assert.equal(requests, 0);
  } finally { db.$client.close(); }
});

test('an uncertain write is not automatically replayed', async () => {
  let requests = 0;
  const db = drizzle({ connection: { origin, tianaToken: 'test-token', fetch: async () => { requests++; throw new TypeError('connection lost'); } } });
  try {
    await assert.rejects(db.run(sql`insert into notes (title) values ('one')`), error => hasMessage(error, 'connection lost'));
    assert.equal(requests, 1);
  } finally { db.$client.close(); }
});

test('HTTP rejection is propagated without replaying the query', async () => {
  let requests = 0;
  const db = drizzle({ connection: { origin, tianaToken: 'test-token', fetch: async () => { requests++; return new Response('Unauthorized', {status: 401}); } } });
  try {
    await assert.rejects(db.run(sql`select 1`));
    assert.equal(requests, 1);
  } finally { db.$client.close(); }
});
