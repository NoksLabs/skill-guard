import * as Schema from 'effect/Schema';

import { AcceptedFinding } from './AcceptedFinding.ts';

export const TrustSource = Schema.Struct({ repo: Schema.String, commit: Schema.String });

export const TrustEntry = Schema.Struct({
  scope: Schema.Literals(['project', 'user', 'plugin', 'file']),
  path: Schema.String,
  source: Schema.NullOr(TrustSource),
  sha256: Schema.String,
  status: Schema.Literals(['approved', 'pending', 'blocked']),
  scannedAt: Schema.String,
  approvedAt: Schema.NullOr(Schema.String),
  acceptedFindings: Schema.Array(AcceptedFinding),
});

export type TrustEntry = typeof TrustEntry.Type;
