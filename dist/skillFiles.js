import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

                         
                                
                                
                              
                                          
  

const IGNORED_NAMES                      = new Set(['.DS_Store']);

const walk = (root        , dir        , seen                     )                           =>
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

const safeStat = (path        ) => (existsSync(path) ? statSync(path) : undefined);

const safeRealpath = (path        )                     =>
  existsSync(path) ? realpathSync(path) : undefined;

export const listSkillFiles = (dir        )                           =>
  walk(dir, dir, new Set([realpathSync(dir)])).toSorted((a, b) =>
    a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0,
  );

export const readSkillFile = (file           )         =>
  safeStat(file.absolutePath) === undefined ? Buffer.alloc(0) : readFileSync(file.absolutePath);

export const sha256 = (content                 )         =>
  createHash('sha256').update(content).digest('hex');

export const hashSkillDir = (dir        )         =>
  listSkillFiles(dir)
    .reduce(
      (hash, file) =>
        hash.update(file.relativePath).update('\0').update(readSkillFile(file)).update('\0'),
      createHash('sha256'),
    )
    .digest('hex');
