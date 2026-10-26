import * as Context from 'effect/Context';
import * as Crypto from 'effect/Crypto';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Layer from 'effect/Layer';
import * as Path from 'effect/Path';
import type * as PlatformError from 'effect/PlatformError';

import { concatBytes } from '../shared/utils/concatBytes.ts';
import { sha256 } from '../shared/utils/sha256.ts';
import { IGNORED_NAMES } from './constants/IgnoredNames.ts';
import type { SkillFile } from './types/SkillFile.ts';

const encoder = new TextEncoder();

const NUL = new Uint8Array([0]);

const byRelativePath = (a: SkillFile, b: SkillFile): number =>
  a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0;

export class SkillFiles extends Context.Service<SkillFiles>()('skill-guard/skill/SkillFiles', {
  make: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const crypto = yield* Crypto.Crypto;

    const walk = (
      root: string,
      dir: string,
      seen: ReadonlySet<string>,
    ): Effect.Effect<ReadonlyArray<SkillFile>, PlatformError.PlatformError> =>
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
            if (!exists || (yield* fs.stat(absolutePath)).type !== 'Directory') {
              return [entry];
            }
            const real = yield* fs.realPath(absolutePath);
            return seen.has(real) ? [] : yield* walk(root, absolutePath, new Set([...seen, real]));
          }),
        );
        return nested.flat();
      });

    const list = Effect.fn('SkillFiles.list')(function* (dir: string) {
      const real = yield* fs.realPath(dir);
      const files = yield* walk(dir, dir, new Set([real]));
      return files.toSorted(byRelativePath);
    });

    const read = Effect.fn('SkillFiles.read')(function* (file: SkillFile) {
      return (yield* fs.exists(file.absolutePath))
        ? yield* fs.readFile(file.absolutePath)
        : new Uint8Array(0);
    });

    const hashDir = Effect.fn('SkillFiles.hashDir')(function* (dir: string) {
      const files = yield* list(dir);
      const parts = yield* Effect.forEach(files, (file) =>
        read(file).pipe(
          Effect.map((content) => [encoder.encode(file.relativePath), NUL, content, NUL]),
        ),
      );
      return yield* sha256(crypto, concatBytes(parts.flat()));
    });

    return { list, read, hashDir };
  }),
}) {
  static readonly Layer = Layer.effect(this)(this.make);
}
