import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import type { Severity } from '../scan/types/Severity.ts';
import { trustState } from './TrustState.ts';
import type { ScanResult } from './types/ScanResult.ts';

export const printResult = Effect.fn('ScanReport.printResult')(function* (
  result: ScanResult,
  verbose: boolean,
) {
  const counts = (severity: Severity) =>
    result.unaccepted.filter((finding) => finding.severity === severity).length;
  const shown = result.unaccepted.filter((finding) => verbose || finding.severity !== 'LOW');
  const accepted = result.findings.length - result.unaccepted.length;
  const state = yield* trustState(result);
  yield* Console.log(
    `\n== ${result.target.id} [${state}] ${result.target.path}  HIGH ${counts('HIGH')} · MEDIUM ${counts('MEDIUM')} · LOW ${counts('LOW')}${accepted > 0 ? ` · accepted ${accepted}` : ''}`,
  );
  yield* Effect.forEach(shown, (finding) =>
    Console.log(
      `  ${finding.severity.padEnd(6)} ${finding.rule.padEnd(18)} ${finding.file}:${finding.line}  ${finding.message}${finding.excerpt === '' ? '' : `  «${finding.excerpt}»`}`,
    ),
  );
});
