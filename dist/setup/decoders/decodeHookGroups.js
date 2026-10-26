import * as Schema from 'effect/Schema';

import { HookGroups } from '../schemas/HookGroups.js';

export const decodeHookGroups = Schema.decodeUnknownOption(HookGroups);
