import { build } from 'esbuild';
import { copyFile } from 'node:fs/promises';
await build({
  entryPoints: ['examples/browser/app.ts'], outfile: 'examples/browser/dist/assets/app.js',
  inject: ['examples/browser/buffer.ts'],
  bundle: true, format: 'esm', platform: 'browser', target: 'es2022',
  alias: { '@tianacloud/drizzle': './src/index.ts' }, minify: true,
});
await copyFile('examples/browser/icon.png', 'examples/browser/dist/icon.png');
