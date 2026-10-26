import * as Effect from 'effect/Effect';

import { TrustRegistryStore } from '../../trust/TrustRegistryStore.ts';

export const registryPathFor = (projectDir: string, user: boolean) =>
  TrustRegistryStore.use((registry) =>
    Effect.succeed(user ? registry.userPath : registry.projectPath(projectDir)),
  );
