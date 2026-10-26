import * as Effect from 'effect/Effect';
                                             

                                                              
import { isoNow } from '../shared/utils/isoNow.js';
                                                                 
import { lockedSource } from './LockedSource.js';

export const draftEntry = Effect.fn('TrustEntryDraft.of')(function* (
  projectDir        ,
  target            ,
  existing                        ,
  source                       ,
) {
  const entry             = {
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
