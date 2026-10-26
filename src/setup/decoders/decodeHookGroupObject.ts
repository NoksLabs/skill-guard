import * as Schema from 'effect/Schema';

import { ClaudeSettings } from '../schemas/ClaudeSettings.ts';

export const decodeHookGroupObject = Schema.decodeUnknownOption(ClaudeSettings);
