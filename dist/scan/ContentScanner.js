import * as Context from 'effect/Context';
import * as Crypto from 'effect/Crypto';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Path from 'effect/Path';

import { sha256 } from '../shared/utils/sha256.js';
import { fileFindings } from './FileFindings.js';
                                                        

export class ContentScanner extends Context.Service                ()(
  'skill-guard/scan/ContentScanner',
  {
    make: Effect.gen(function* () {
      const path = yield* Path.Path;
      const crypto = yield* Crypto.Crypto;
      const scan = Effect.fn('ContentScanner.scan')(function* (target            ) {
        const fileSha256 = yield* sha256(crypto, target.content);
        return fileFindings(target, fileSha256, path.extname(target.file).toLowerCase());
      });
      return { scan };
    }),
  },
) {
  static          Layer = Layer.effect(this)(this.make);
}
