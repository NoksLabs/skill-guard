import * as Schema from 'effect/Schema';

import { SkillsLock } from '../schemas/SkillsLock.js';

export const decodeSkillsLock = Schema.decodeUnknownEffect(Schema.fromJsonString(SkillsLock));
