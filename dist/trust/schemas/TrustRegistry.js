import * as Schema from 'effect/Schema';

import { TrustEntry } from './TrustEntry.js';

export const TrustRegistry = Schema.Struct({
  version: Schema.Literal(1),
  entries: Schema.Record(Schema.String, TrustEntry),
});

                                                      
