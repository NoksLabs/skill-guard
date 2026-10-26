import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { UsageError } from '../errors/UsageError.js';

export const usageError = (message        )                                   =>
  Console.error(message).pipe(Effect.andThen(new UsageError({ message })));
