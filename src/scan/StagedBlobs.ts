import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { ChildProcess, ChildProcessSpawner } from 'effect/process';
import * as Stream from 'effect/Stream';

import { concatBytes } from '../shared/utils/concatBytes.ts';
import { SCANNED_PREFIXES } from './constants/ScanRoots.ts';

const isScanned = (path: string): boolean =>
  SCANNED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`),
  );

const git = (projectDir: string, args: ReadonlyArray<string>) =>
  ChildProcess.make('git', args, { cwd: projectDir });

export class StagedBlobs extends Context.Service<StagedBlobs>()('skill-guard/scan/StagedBlobs', {
  make: Effect.gen(function* () {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;

    const paths = Effect.fn('StagedBlobs.paths')(function* (projectDir: string) {
      const output = yield* spawner.string(
        git(projectDir, ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']),
      );
      return output.split('\0').filter((path) => path.length > 0 && isScanned(path));
    });

    const content = Effect.fn('StagedBlobs.content')(function* (projectDir: string, path: string) {
      const handle = yield* spawner.spawn(git(projectDir, ['show', `:${path}`]));
      const chunks = yield* Stream.runCollect(handle.stdout);
      const exitCode = yield* handle.exitCode;
      if (exitCode !== ChildProcessSpawner.ExitCode(0)) {
        return yield* Effect.die(new Error(`git show :${path} exited with ${exitCode}`));
      }
      return concatBytes(chunks);
    }, Effect.scoped);

    return { paths, content };
  }),
}) {
  static readonly Layer = Layer.effect(this)(this.make);
}
