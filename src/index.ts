import { createClient, type Config } from '@libsql/client/http';
import { createTianaFetch, type TianaFetchOptions } from '@tianacloud/serverless';
import { drizzle as libsqlDrizzle } from 'drizzle-orm/libsql/http';
import type { DrizzleConfig } from 'drizzle-orm/utils';

export type TianaConnectionOptions = Omit<TianaFetchOptions, 'protocol' | 'requestBodyMode' | 'auth' | 'tianaToken'>
  & Pick<Config, 'intMode' | 'concurrency'>
  & (
    | { auth: NonNullable<TianaFetchOptions['auth']>; tianaToken?: never }
    | { tianaToken: string; auth?: never }
  );

export type TianaDrizzleConfig<TSchema extends Record<string, unknown> = Record<string, never>> =
  DrizzleConfig<TSchema> & { connection: TianaConnectionOptions };

/** Connect Drizzle to Tiana SQLite. Close db.$client when finished. */
export function drizzle<TSchema extends Record<string, unknown> = Record<string, never>>(
  { connection, ...config }: TianaDrizzleConfig<TSchema>,
) {
  const { intMode, concurrency, ...transport } = connection;
  const client = createClient({
    url: String(connection.origin),
    intMode,
    concurrency,
    fetch: createTianaFetch({ ...transport, requestBodyMode: 'buffered' }),
  });
  return libsqlDrizzle({ ...config, client });
}
