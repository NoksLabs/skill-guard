import * as Effect from 'effect/Effect';

import { ContentScanner } from '../scan/ContentScanner.js';
                                                              
import { sortFindings } from '../scan/utils/sortFindings.js';
import { TrustRegistryStore } from '../trust/TrustRegistryStore.js';
import { isAccepted } from '../trust/utils/isAccepted.js';
                                                        

export const reviewTarget = Effect.fn('ScanReview.reviewTarget')(function* (
  projectDir        ,
  target            ,
) {
  const scanner = yield* ContentScanner;
  const registry = yield* TrustRegistryStore;
  const scanned = yield* Effect.forEach(target.files, (file) => scanner.scan(file));
  const findings = sortFindings(scanned.flat());
  const entry = yield* registry.entryFor(projectDir, target.id);
  const unaccepted = findings.filter(
    (finding) => !isAccepted(finding, entry?.acceptedFindings ?? []),
  );
  const result             = { target, findings, entry, unaccepted };
  return result;
});

export const hasUnacceptedHigh = (result            )          =>
  result.unaccepted.some((finding) => finding.severity === 'HIGH');
