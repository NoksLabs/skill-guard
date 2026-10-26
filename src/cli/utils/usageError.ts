import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { UsageError } from '../errors/UsageError.ts';

export const usageError = (message: string): Effect.Effect<never, UsageError> =>
  Console.error(message).pipe(Effect.andThen(new UsageError({ message })));
