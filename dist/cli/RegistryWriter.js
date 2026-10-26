import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

                                                                 
import { TrustRegistryStore } from '../trust/TrustRegistryStore.js';

export const writeEntry = Effect.fn('RegistryWriter.writeEntry')(function* (
  registryPath        ,
  id        ,
  change                                               ,
) {
  const registry = yield* TrustRegistryStore;
  yield* registry.update(registryPath, id, change);
  yield* Console.log(`${id}: written to ${registryPath}`);
});
