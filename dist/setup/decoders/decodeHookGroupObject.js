import * as Schema from 'effect/Schema';

import { ClaudeSettings } from '../schemas/ClaudeSettings.js';

export const decodeHookGroupObject = Schema.decodeUnknownOption(ClaudeSettings);
