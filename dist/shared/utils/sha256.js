                                             
import * as Effect from 'effect/Effect';
import { Hex } from 'effect/encoding';
                                                           

export const sha256 = (
  crypto               ,
  content            ,
)                                                     =>
  crypto.digest('SHA-256', content).pipe(Effect.map(Hex.encode));
