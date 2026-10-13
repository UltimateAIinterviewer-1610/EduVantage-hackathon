import { build } from 'esbuild';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const output = await mkdtemp(join(tmpdir(), 'eduvantage-api-functions-'));
const routes = ['ai', 'live-token', 'delete-account'];
try {
  // Match a production Node ESM function package: transpile files separately so
  // native Node must resolve every relative import from the emitted files.
  await build({
    entryPoints: [
      ...routes.map((route) => `api/${route}.ts`),
      'server/auth.ts',
      'services/providerCatalog.ts',
      'services/providerProtocol.ts',
      'services/providerLimits.ts',
      'services/providerDiagnostics.ts',
    ],
    outbase: '.',
    outdir: output,
    bundle: false,
    platform: 'node',
    format: 'esm',
    target: 'node22',
  });

  for (const route of routes) {
    const path = resolve(output, 'api', `${route}.js`);
    const source = await readFile(path, 'utf8');
    if (/from ['"]\.\.?\/[^'"]+(?<!\.js)['"]/.test(source)) {
      throw new Error(`${route} has an extensionless runtime import`);
    }
    const { default: handler } = await import(pathToFileURL(path).href);
    const result = { status: 200, body: null };
    const response = {
      status(code) { result.status = code; return this; },
      setHeader() { return this; },
      json(body) { result.body = body; },
    };
    await handler({ method: 'GET', headers: {} }, response);
    if (result.status !== 405 || result.body?.error !== 'Method not allowed.') {
      throw new Error(`${route} GET returned ${result.status} instead of 405`);
    }
    process.stdout.write(`/api/${route}: packaged Node ESM GET returned 405\n`);
  }
  const emitted = await readdir(resolve(output, 'services'));
  if (!emitted.includes('providerCatalog.js')) throw new Error('Shared provider modules were not emitted');
} finally {
  await rm(output, { recursive: true, force: true });
}
