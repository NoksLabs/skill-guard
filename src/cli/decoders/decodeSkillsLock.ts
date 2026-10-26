import * as Schema from 'effect/Schema';

import { SkillsLock } from '../schemas/SkillsLock.ts';

export const decodeSkillsLock = Schema.decodeUnknownEffect(Schema.fromJsonString(SkillsLock));
