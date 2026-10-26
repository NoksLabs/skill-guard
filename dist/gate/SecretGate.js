import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Path from 'effect/Path';

import { Environment } from '../shared/Environment.js';
                                                                     
import {
  SECRET_DIRECTORY,
  SECRET_FILE_NAME,
  SECRET_TEMPLATE_NAME,
} from './constants/SecretPaths.js';
import { commandPathTokens } from './utils/commandPathTokens.js';
import { expandHome } from './utils/expandHome.js';

const ALLOWED                = { allowed: true };

const deniedFor = (candidate        )                => ({
  allowed: false,
  reason: `"${candidate}" looks like a secret file (.env, keys, credentials); skill-guard keeps it out of the agent's context.`,
});

export class SecretGate extends Context.Service            ()('skill-guard/gate/SecretGate', {
  make: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const env = yield* Environment;

    const isSecret = (absolutePath        )          =>
      !SECRET_TEMPLATE_NAME.test(path.basename(absolutePath)) &&
      (SECRET_FILE_NAME.test(path.basename(absolutePath)) || SECRET_DIRECTORY.test(absolutePath));

    const isSecretCandidate = (cwd        , candidate        ) => {
      const absolutePath = path.resolve(cwd, expandHome(candidate, env.home));
      return isSecret(absolutePath)
        ? Effect.succeed(true)
        : fs.realPath(absolutePath).pipe(
            Effect.map(isSecret),
            Effect.orElseSucceed(() => false),
          );
    };

    const checkPaths = Effect.fn('SecretGate.checkPaths')(function* (
      cwd        ,
      candidates                       ,
    ) {
      const flagged = yield* Effect.findFirst(candidates, (candidate) =>
        isSecretCandidate(cwd, candidate),
      );
      return Option.match(flagged, { onNone: () => ALLOWED, onSome: deniedFor });
    });

    const checkCommand = (cwd        , command        ) =>
      checkPaths(cwd, commandPathTokens(command));

    return { checkPaths, checkCommand };
  }),
}) {
  static          Layer = Layer.effect(this)(this.make).pipe(Layer.provide(Environment.Layer));
}
