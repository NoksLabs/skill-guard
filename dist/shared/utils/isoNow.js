import * as DateTime from 'effect/DateTime';
import * as Effect from 'effect/Effect';

export const isoNow                        = DateTime.now.pipe(Effect.map(DateTime.formatIso));
