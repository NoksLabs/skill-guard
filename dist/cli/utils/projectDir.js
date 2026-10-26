import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Path from 'effect/Path';

import { Environment } from '../../shared/Environment.js';

export const projectDir = Effect.gen(function* () {
  const env = yield* Environment;
  const path = yield* Path.Path;
  return path.resolve(Option.getOrElse(env.projectDirOverride, () => env.cwd));
});
