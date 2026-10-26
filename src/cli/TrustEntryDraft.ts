import * as Effect from 'effect/Effect';
import type * as Option from 'effect/Option';

import type { ScanTarget } from '../scan/types/ScanTarget.ts';
import { isoNow } from '../shared/utils/isoNow.ts';
import type { TrustEntry } from '../trust/schemas/TrustEntry.ts';
import { lockedSource } from './LockedSource.ts';

export const draftEntry = Effect.fn('TrustEntryDraft.of')(function* (
  projectDir: string,
  target: ScanTarget,
  existing: TrustEntry | undefined,
  source: Option.Option<string>,
) {
  const entry: TrustEntry = {
    scope: target.scope,
    path: target.path,
    source: existing?.source ?? (yield* lockedSource(projectDir, target.id, source)),
    sha256: existing?.sha256 ?? '',
    status: existing?.status ?? 'pending',
    scannedAt: yield* isoNow,
    approvedAt: existing?.approvedAt ?? null,
    acceptedFindings: existing?.acceptedFindings ?? [],
  };
  return entry;
});
