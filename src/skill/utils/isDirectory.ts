import * as Effect from 'effect/Effect';
import type * as FileSystem from 'effect/FileSystem';
import type * as PlatformError from 'effect/PlatformError';

export const isDirectory = (
  fs: FileSystem.FileSystem,
  path: string,
): Effect.Effect<boolean, PlatformError.PlatformError> =>
  fs
    .exists(path)
    .pipe(
      Effect.flatMap((exists) =>
        exists
          ? fs.stat(path).pipe(Effect.map((stats) => stats.type === 'Directory'))
          : Effect.succeed(false),
      ),
    );
