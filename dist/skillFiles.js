import * as Crypto from 'effect/Crypto';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Path from 'effect/Path';
import { Hex } from 'effect/encoding';
                                                          

                         
                                
                                
                              
                                          
  

const IGNORED_NAMES                      = new Set(['.DS_Store']);

const encoder = new TextEncoder();

export const concatBytes = (chunks                           )             => {
  const out = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  chunks.reduce((offset, chunk) => (out.set(chunk, offset), offset + chunk.length), 0);
  return out;
};

export const sha256 = (
  content                     ,
)                                                      =>
  Crypto.Crypto.use((crypto) =>
    crypto
      .digest('SHA-256', typeof content === 'string' ? encoder.encode(content) : content)
      .pipe(Effect.map(Hex.encode)),
  );

const walk = (
  fs                       ,
  path           ,
  root        ,
  dir        ,
  seen                     ,
)                                                         =>
  Effect.gen(function* () {
    const names = (yield* fs.readDirectory(dir))
      .filter((name) => !IGNORED_NAMES.has(name))
      .toSorted();
    const nested = yield* Effect.forEach(names, (name) =>
      Effect.gen(function* () {
        const absolutePath = path.join(dir, name);
        const isSymlink = (yield* fs.lstat(absolutePath)).type === 'SymbolicLink';
        const exists = yield* fs.exists(absolutePath);
        const linkTarget = isSymlink && exists ? yield* fs.realPath(absolutePath) : undefined;
        const entry            = {
          relativePath: path.relative(root, absolutePath),
          absolutePath,
          isSymlink,
          linkTarget,
        };
        if (!exists) {
          return [entry];
        }
        const stats = yield* fs.stat(absolutePath);
        if (stats.type !== 'Directory') {
          return [entry];
        }
        const real = yield* fs.realPath(absolutePath);
        return seen.has(real)
          ? []
          : yield* walk(fs, path, root, absolutePath, new Set([...seen, real]));
      }),
    );
    return nested.flat();
  });

export const listSkillFiles = (
  dir        ,
)                                                                                            =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const real = yield* fs.realPath(dir);
    const files = yield* walk(fs, path, dir, dir, new Set([real]));
    return files.toSorted((a, b) =>
      a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0,
    );
  });

export const readSkillFile = (
  file           ,
)                                                                  =>
  FileSystem.FileSystem.use((fs) =>
    fs
      .exists(file.absolutePath)
      .pipe(
        Effect.flatMap((exists) =>
          exists ? fs.readFile(file.absolutePath) : Effect.succeed(new Uint8Array(0)),
        ),
      ),
  );

const NUL = new Uint8Array([0]);

export const hashSkillDir = (
  dir        ,
)                                                                                          =>
  Effect.gen(function* () {
    const files = yield* listSkillFiles(dir);
    const parts = yield* Effect.forEach(files, (file) =>
      readSkillFile(file).pipe(
        Effect.map((content) => [encoder.encode(file.relativePath), NUL, content, NUL]),
      ),
    );
    return yield* sha256(concatBytes(parts.flat()));
  });
