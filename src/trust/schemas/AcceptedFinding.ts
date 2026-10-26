import * as Schema from 'effect/Schema';

export const AcceptedFinding = Schema.Struct({
  rule: Schema.String,
  file: Schema.String,
  fileSha256: Schema.String,
  note: Schema.String,
  acceptedAt: Schema.String,
});

export type AcceptedFinding = typeof AcceptedFinding.Type;
