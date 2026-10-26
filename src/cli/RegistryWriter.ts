import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import type { TrustEntry } from '../trust/schemas/TrustEntry.ts';
import { TrustRegistryStore } from '../trust/TrustRegistryStore.ts';

export const writeEntry = Effect.fn('RegistryWriter.writeEntry')(function* (
  registryPath: string,
  id: string,
  change: (entry: TrustEntry | undefined) => TrustEntry,
) {
  const registry = yield* TrustRegistryStore;
  yield* registry.update(registryPath, id, change);
  yield* Console.log(`${id}: written to ${registryPath}`);
});
