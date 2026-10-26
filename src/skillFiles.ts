import * as Crypto from 'effect/Crypto';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Path from 'effect/Path';
import { Hex } from 'effect/encoding';
import type { PlatformError } from 'effect/PlatformError';

export type SkillFile = {
  readonly relativePath: string;
  readonly absolutePath: string;
  readonly isSymlink: boolean;
  readonly linkTarget: string | undefined;
};

const IGNORED_NAMES: ReadonlySet<string> = new Set(['.DS_Store']);

const encoder = new TextEncoder();

export const concatBytes = (chunks: ReadonlyArray<Uint8Array>): Uint8Array => {
  const out = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  chunks.reduce((offset, chunk) => (out.set(chunk, offset), offset + chunk.length), 0);
  return out;
};

export const sha256 = (
  content: Uint8Array | string,
): Effect.Effect<string, PlatformError, Crypto.Crypto> =>
  Crypto.Crypto.use((crypto) =>
    crypto
      .digest('SHA-256', typeof content === 'string' ? encoder.encode(content) : content)
      .pipe(Effect.map(Hex.encode)),
  );

const walk = (
  fs: FileSystem.FileSystem,
  path: Path.Path,
  root: string,
  dir: string,
  seen: ReadonlySet<string>,
): Effect.Effect<ReadonlyArray<SkillFile>, PlatformError> =>
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
        const entry: SkillFile = {
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
  dir: string,
): Effect.Effect<ReadonlyArray<SkillFile>, PlatformError, FileSystem.FileSystem | Path.Path> =>
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
  file: SkillFile,
): Effect.Effect<Uint8Array, PlatformError, FileSystem.FileSystem> =>
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
  dir: string,
): Effect.Effect<string, PlatformError, FileSystem.FileSystem | Path.Path | Crypto.Crypto> =>
  Effect.gen(function* () {
    const files = yield* listSkillFiles(dir);
    const parts = yield* Effect.forEach(files, (file) =>
      readSkillFile(file).pipe(
        Effect.map((content) => [encoder.encode(file.relativePath), NUL, content, NUL]),
      ),
    );
    return yield* sha256(concatBytes(parts.flat()));
  });
