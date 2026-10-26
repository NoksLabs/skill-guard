import * as Effect from 'effect/Effect';

import { TrustRegistryStore } from '../../trust/TrustRegistryStore.js';

export const registryPathFor = (projectDir        , user         ) =>
  TrustRegistryStore.use((registry) =>
    Effect.succeed(user ? registry.userPath : registry.projectPath(projectDir)),
  );
