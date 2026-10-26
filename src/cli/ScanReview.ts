import * as Effect from 'effect/Effect';

import { ContentScanner } from '../scan/ContentScanner.ts';
import type { ScanTarget } from '../scan/types/ScanTarget.ts';
import { sortFindings } from '../scan/utils/sortFindings.ts';
import { TrustRegistryStore } from '../trust/TrustRegistryStore.ts';
import { isAccepted } from '../trust/utils/isAccepted.ts';
import type { ScanResult } from './types/ScanResult.ts';

export const reviewTarget = Effect.fn('ScanReview.reviewTarget')(function* (
  projectDir: string,
  target: ScanTarget,
) {
  const scanner = yield* ContentScanner;
  const registry = yield* TrustRegistryStore;
  const scanned = yield* Effect.forEach(target.files, (file) => scanner.scan(file));
  const findings = sortFindings(scanned.flat());
  const entry = yield* registry.entryFor(projectDir, target.id);
  const unaccepted = findings.filter(
    (finding) => !isAccepted(finding, entry?.acceptedFindings ?? []),
  );
  const result: ScanResult = { target, findings, entry, unaccepted };
  return result;
});

export const hasUnacceptedHigh = (result: ScanResult): boolean =>
  result.unaccepted.some((finding) => finding.severity === 'HIGH');
