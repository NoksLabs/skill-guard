import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Layer from 'effect/Layer';
import * as Path from 'effect/Path';

import { Environment } from '../shared/Environment.js';
import { REGISTRY_FILE } from './constants/RegistryPaths.js';
import { decodeTrustRegistry } from './decoders/decodeTrustRegistry.js';
import { encodeTrustRegistry } from './encoders/encodeTrustRegistry.js';
                                                          
                                                                

const EMPTY_REGISTRY                = { version: 1, entries: {} };

export class TrustRegistryStore extends Context.Service                    ()(
  'skill-guard/trust/TrustRegistryStore',
  {
    make: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const env = yield* Environment;

      const projectPath = (projectDir        )         => path.join(projectDir, ...REGISTRY_FILE);
      const userPath = path.join(env.home, ...REGISTRY_FILE);

      const load = Effect.fn('TrustRegistryStore.load')(function* (registryPath        ) {
        if (!(yield* fs.exists(registryPath))) {
          return EMPTY_REGISTRY;
        }
        return yield* decodeTrustRegistry(yield* fs.readFileString(registryPath));
      });

      const save = Effect.fn('TrustRegistryStore.save')(function* (
        registryPath        ,
        registry               ,
      ) {
        yield* fs.makeDirectory(path.dirname(registryPath), { recursive: true });
        yield* fs.writeFileString(registryPath, encodeTrustRegistry(registry));
      });

      const entryFor = Effect.fn('TrustRegistryStore.entryFor')(function* (
        projectDir        ,
        id        ,
      ) {
        const project = yield* load(projectPath(projectDir));
        const user = yield* load(userPath);
        return project.entries[id] ?? user.entries[id];
      });

      const update = Effect.fn('TrustRegistryStore.update')(function* (
        registryPath        ,
        id        ,
        change                                               ,
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
  static          Layer = Layer.effect(this)(this.make).pipe(Layer.provide(Environment.Layer));
}
