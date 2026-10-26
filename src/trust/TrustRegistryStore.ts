import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Layer from 'effect/Layer';
import * as Path from 'effect/Path';

import { Environment } from '../shared/Environment.ts';
import { REGISTRY_FILE } from './constants/RegistryPaths.ts';
import { decodeTrustRegistry } from './decoders/decodeTrustRegistry.ts';
import { encodeTrustRegistry } from './encoders/encodeTrustRegistry.ts';
import type { TrustEntry } from './schemas/TrustEntry.ts';
import type { TrustRegistry } from './schemas/TrustRegistry.ts';

const EMPTY_REGISTRY: TrustRegistry = { version: 1, entries: {} };

export class TrustRegistryStore extends Context.Service<TrustRegistryStore>()(
  'skill-guard/trust/TrustRegistryStore',
  {
    make: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const env = yield* Environment;

      const projectPath = (projectDir: string): string => path.join(projectDir, ...REGISTRY_FILE);
      const userPath = path.join(env.home, ...REGISTRY_FILE);

      const load = Effect.fn('TrustRegistryStore.load')(function* (registryPath: string) {
        if (!(yield* fs.exists(registryPath))) {
          return EMPTY_REGISTRY;
        }
        return yield* decodeTrustRegistry(yield* fs.readFileString(registryPath));
      });

      const save = Effect.fn('TrustRegistryStore.save')(function* (
        registryPath: string,
        registry: TrustRegistry,
      ) {
        yield* fs.makeDirectory(path.dirname(registryPath), { recursive: true });
        yield* fs.writeFileString(registryPath, encodeTrustRegistry(registry));
      });

      const entryFor = Effect.fn('TrustRegistryStore.entryFor')(function* (
        projectDir: string,
        id: string,
      ) {
        const project = yield* load(projectPath(projectDir));
        const user = yield* load(userPath);
        return project.entries[id] ?? user.entries[id];
      });

      const update = Effect.fn('TrustRegistryStore.update')(function* (
        registryPath: string,
        id: string,
        change: (entry: TrustEntry | undefined) => TrustEntry,
      ) {
        const registry = yield* load(registryPath);
        yield* save(registryPath, {
          ...registry,
          entries: { ...registry.entries, [id]: change(registry.entries[id]) },
        });
      });

      return { projectPath, userPath, load, save, entryFor, update };
    }),
  },
) {
  static readonly Layer = Layer.effect(this)(this.make).pipe(Layer.provide(Environment.Layer));
}
