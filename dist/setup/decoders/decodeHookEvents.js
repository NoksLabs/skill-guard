import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { HookEvents } from '../schemas/ClaudeSettings.js';

const decode = Schema.decodeUnknownOption(HookEvents);

export const decodeHookEvents = (value                         )             =>
  Option.getOrElse(decode(value), () => ({}));
