import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const sourceDir = join(root, 'src');
const outDir = join(root, 'dist');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

readdirSync(sourceDir)
  .filter((name) => name.endsWith('.ts'))
  .forEach((name) => {
    const source = readFileSync(join(sourceDir, name), 'utf8');
    const stripped = stripTypeScriptTypes(source, { mode: 'strip' });
    writeFileSync(
      join(outDir, name.replace(/\.ts$/, '.js')),
      stripped.replace(/(from\s+['"]\.{1,2}\/[^'"]+)\.ts(['"])/g, '$1.js$2'),
    );
  });
