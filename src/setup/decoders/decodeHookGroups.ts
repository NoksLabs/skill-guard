import * as Schema from 'effect/Schema';

import { HookGroups } from '../schemas/HookGroups.ts';

export const decodeHookGroups = Schema.decodeUnknownOption(HookGroups);
