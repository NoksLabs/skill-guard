import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { HookInput } from '../schemas/HookInput.ts';

const decode = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.NullOr(HookInput)));

export const decodeHookInput = (raw: string): Effect.Effect<HookInput, Schema.SchemaError> =>
  decode(raw).pipe(Effect.map((parsed) => parsed ?? {}));
