import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Path from 'effect/Path';

import { ScanTargets } from '../scan/ScanTargets.js';
import { ScanFailed } from './errors/ScanFailed.js';
import { printResult } from './ScanReport.js';
import { hasUnacceptedHigh, reviewTarget } from './ScanReview.js';
                                                          
import { projectDir } from './utils/projectDir.js';

export const runScan = Effect.fn('RunScan.run')(function* (options             ) {
  const dir = yield* projectDir;
  const path = yield* Path.Path;
  const targets = yield* ScanTargets;
  const selected = options.staged
    ? yield* targets.staged(dir)
    : Option.isNone(options.target)
      ? yield* targets.defaults(dir)
      : yield* targets.forPath(
          dir,
          options.target.value.includes('/')
            ? path.resolve(options.target.value)
            : options.target.value,
        );
  const results = yield* Effect.forEach(selected, (target) => reviewTarget(dir, target), {
    concurrency: 8,
  });
  yield* Effect.forEach(
    results.filter(
      (result) => options.all || result.findings.length > 0 || result.target.skill !== undefined,
    ),
    (result) => printResult(result, options.verbose),
  );
  const blocking = results.filter(hasUnacceptedHigh);
  yield* Console.log(
    `\n${results.length} targets scanned; ${blocking.length} with unaccepted HIGH findings.`,
  );
  return yield* blocking.length > 0 ? new ScanFailed() : Effect.void;
});
