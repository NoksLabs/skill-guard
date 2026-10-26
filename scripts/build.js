import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { dirname, join, relative } from 'node:path';

const root = join(import.meta.dirname, '..');
const sourceDir = join(root, 'src');
const outDir = join(root, 'dist');

rmSync(outDir, { recursive: true, force: true });

readdirSync(sourceDir, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
  .forEach((entry) => {
    const sourcePath = join(entry.parentPath, entry.name);
    const outPath = join(outDir, relative(sourceDir, sourcePath)).replace(/\.ts$/, '.js');
    const stripped = stripTypeScriptTypes(readFileSync(sourcePath, 'utf8'), { mode: 'strip' });
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, stripped.replace(/(from\s+['"]\.{1,2}\/[^'"]+)\.ts(['"])/g, '$1.js$2'));
  });
