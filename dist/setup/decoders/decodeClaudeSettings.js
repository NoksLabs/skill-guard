import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ClaudeSettings } from '../schemas/ClaudeSettings.js';

const decode = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.NullOr(ClaudeSettings)));

export const decodeClaudeSettings = (
  raw        ,
)                                                    =>
  decode(raw).pipe(Effect.map((parsed) => parsed ?? {}));
