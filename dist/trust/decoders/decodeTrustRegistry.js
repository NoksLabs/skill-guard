import * as Schema from 'effect/Schema';

import { TrustRegistry } from '../schemas/TrustRegistry.js';

export const decodeTrustRegistry = Schema.decodeUnknownEffect(Schema.fromJsonString(TrustRegistry));
