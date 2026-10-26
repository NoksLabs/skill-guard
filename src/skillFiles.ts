import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export type SkillFile = {
  readonly relativePath: string;
  readonly absolutePath: string;
  readonly isSymlink: boolean;
  readonly linkTarget: string | undefined;
};

const IGNORED_NAMES: ReadonlySet<string> = new Set(['.DS_Store']);

const walk = (root: string, dir: string, seen: ReadonlySet<string>): ReadonlyArray<SkillFile> =>
  readdirSync(dir)
    .filter((name) => !IGNORED_NAMES.has(name))
    .toSorted()
    .flatMap((name) => {
      const absolutePath = join(dir, name);
      const isSymlink = lstatSync(absolutePath).isSymbolicLink();
      const linkTarget = isSymlink ? safeRealpath(absolutePath) : undefined;
      const stats = safeStat(absolutePath);
      if (stats === undefined) {
        return [
          { relativePath: relative(root, absolutePath), absolutePath, isSymlink, linkTarget },
        ];
      }
      if (stats.isDirectory()) {
        const real = realpathSync(absolutePath);
        return seen.has(real) ? [] : walk(root, absolutePath, new Set([...seen, real]));
      }
      return [{ relativePath: relative(root, absolutePath), absolutePath, isSymlink, linkTarget }];
    });

const safeStat = (path: string) => (existsSync(path) ? statSync(path) : undefined);

const safeRealpath = (path: string): string | undefined =>
  existsSync(path) ? realpathSync(path) : undefined;

export const listSkillFiles = (dir: string): ReadonlyArray<SkillFile> =>
  walk(dir, dir, new Set([realpathSync(dir)])).toSorted((a, b) =>
    a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0,
  );

export const readSkillFile = (file: SkillFile): Buffer =>
  safeStat(file.absolutePath) === undefined ? Buffer.alloc(0) : readFileSync(file.absolutePath);

export const sha256 = (content: Buffer | string): string =>
  createHash('sha256').update(content).digest('hex');

export const hashSkillDir = (dir: string): string =>
  listSkillFiles(dir)
    .reduce(
      (hash, file) =>
        hash.update(file.relativePath).update('\0').update(readSkillFile(file)).update('\0'),
      createHash('sha256'),
    )
    .digest('hex');
