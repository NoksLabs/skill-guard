import type * as Crypto from 'effect/Crypto';
import * as Effect from 'effect/Effect';
import { Hex } from 'effect/encoding';
import type * as PlatformError from 'effect/PlatformError';

export const sha256 = (
  crypto: Crypto.Crypto,
  content: Uint8Array,
): Effect.Effect<string, PlatformError.PlatformError> =>
  crypto.digest('SHA-256', content).pipe(Effect.map(Hex.encode));
