import * as Effect from 'effect/Effect';
import * as Path from 'effect/Path';

import { ScanTargets } from '../scan/ScanTargets.ts';

export const singleTarget = Effect.fn('SingleTarget.of')(function* (
  projectDir: string,
  id: string,
) {
  const targets = yield* ScanTargets;
  const path = yield* Path.Path;
  if (id.startsWith('file:')) {
    return (yield* targets.forPath(projectDir, path.resolve(projectDir, id.slice(5)))).at(0);
  }
  return (yield* targets.defaults(projectDir)).find((target) => target.id === id);
});
