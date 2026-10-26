import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ClaudeSettings } from '../schemas/ClaudeSettings.ts';

const decode = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.NullOr(ClaudeSettings)));

export const decodeClaudeSettings = (
  raw: string,
): Effect.Effect<ClaudeSettings, Schema.SchemaError> =>
  decode(raw).pipe(Effect.map((parsed) => parsed ?? {}));
