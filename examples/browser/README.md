# Browser example

This small notes app uses the package with Drizzle's normal SQLite schema and
query APIs. It creates its own `drizzle_notes` and `drizzle_values` tables.
Use a dedicated test database: the checks insert, update, and remove their own
rows, while notes entered in the UI remain until deleted.

From the repository root:

```sh
npm ci
npm run build:example
```

Create a Tiana SQLite instance and a Web application with entry `assets/app.js`,
bind that database, then serve the built example using your logged-in Tiana CLI:

```sh
tiana sqlite create drizzle-example --wait
tiana web create drizzle-example --entry assets/app.js --database-instance-id DATABASE_ID --json
tiana web serve WEB_ID --dir examples/browser/dist --port 4174
```

Open the one-use authorization link printed by the CLI. Add a note, mark it done,
reload, and delete it. The **Run database checks** button exercises typed values,
prepared queries, interactive transactions, nested savepoints, rollback, atomic
batches, and concurrent reads against the same real database.

The example's build script injects `Buffer` from the `buffer` package for Drizzle's
BLOB columns. Applications using only text and numeric columns do not need it.

## Automated browser checks

Install the test browsers:

```sh
npx playwright install chromium webkit
```

Save a Playwright storage state after opening the CLI's authorization link. Keep
that file outside the repository: it contains browser credentials. Point the tests
at the normal application URL (not the one-use authorization link):

```sh
TIANA_TEST_URL=http://127.0.0.1:4174/web/WEB_ID/ \
TIANA_TEST_STORAGE_STATE=/absolute/private/path/browser-state.json \
npm run test:browser
```

The tests use actual browser requests and actual SQLite data. Authentication and
database responses are not mocked. They also exercise a narrow mobile viewport
and temporary browser offline mode. Mobile WebKit emulation does not replace
testing on physical devices.
