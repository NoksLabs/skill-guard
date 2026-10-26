import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Path from 'effect/Path';

import { Environment } from '../shared/Environment.ts';
import type { TrustDecision } from '../trust/types/TrustDecision.ts';
import {
  SECRET_DIRECTORY,
  SECRET_FILE_NAME,
  SECRET_TEMPLATE_NAME,
} from './constants/SecretPaths.ts';
import { commandPathTokens } from './utils/commandPathTokens.ts';
import { expandHome } from './utils/expandHome.ts';

const ALLOWED: TrustDecision = { allowed: true };

const deniedFor = (candidate: string): TrustDecision => ({
  allowed: false,
  reason: `"${candidate}" looks like a secret file (.env, keys, credentials); skill-guard keeps it out of the agent's context.`,
});

export class SecretGate extends Context.Service<SecretGate>()('skill-guard/gate/SecretGate', {
  make: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const env = yield* Environment;

    const isSecret = (absolutePath: string): boolean =>
      !SECRET_TEMPLATE_NAME.test(path.basename(absolutePath)) &&
      (SECRET_FILE_NAME.test(path.basename(absolutePath)) || SECRET_DIRECTORY.test(absolutePath));

    const isSecretCandidate = (cwd: string, candidate: string) => {
      const absolutePath = path.resolve(cwd, expandHome(candidate, env.home));
      return isSecret(absolutePath)
        ? Effect.succeed(true)
        : fs.realPath(absolutePath).pipe(
            Effect.map(isSecret),
            Effect.orElseSucceed(() => false),
          );
    };

    const checkPaths = Effect.fn('SecretGate.checkPaths')(function* (
      cwd: string,
      candidates: ReadonlyArray<string>,
    ) {
      const flagged = yield* Effect.findFirst(candidates, (candidate) =>
        isSecretCandidate(cwd, candidate),
      );
      return Option.match(flagged, { onNone: () => ALLOWED, onSome: deniedFor });
    });

    const checkCommand = (cwd: string, command: string) =>
      checkPaths(cwd, commandPathTokens(command));

    return { checkPaths, checkCommand };
  }),
}) {
  static readonly Layer = Layer.effect(this)(this.make).pipe(Layer.provide(Environment.Layer));
}
