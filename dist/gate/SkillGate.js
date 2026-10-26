import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Path from 'effect/Path';

import { SkillFiles } from '../skill/SkillFiles.js';
import { SkillLocator } from '../skill/SkillLocator.js';
                                                                     
import { decideTrust } from '../trust/TrustPolicy.js';
import { TrustRegistryStore } from '../trust/TrustRegistryStore.js';
                                                                     

const ALLOWED                = { allowed: true };

const approveHintFor = (location               )         =>
  location.scope === 'project'
    ? `skill-guard approve ${location.id}`
    : `skill-guard approve ${location.id} --user`;

export class SkillGate extends Context.Service           ()('skill-guard/gate/SkillGate', {
  make: Effect.gen(function* () {
    const path = yield* Path.Path;
    const skillFiles = yield* SkillFiles;
    const locator = yield* SkillLocator;
    const registry = yield* TrustRegistryStore;

    const checkSkill = Effect.fn('SkillGate.checkSkill')(function* (
      projectDir        ,
      location               ,
    ) {
      const project = (yield* registry.load(registry.projectPath(projectDir))).entries;
      const user =
        location.scope === 'project' ? {} : (yield* registry.load(registry.userPath)).entries;
      return decideTrust({
        id: location.id,
        currentSha256: yield* skillFiles.hashDir(location.dir),
        entries: [project[location.id], user[location.id]],
        approveHint: approveHintFor(location),
      });
    });

    const checkInvocation = Effect.fn('SkillGate.checkInvocation')(function* (
      projectDir        ,
      invokedName        ,
    ) {
      const location = yield* locator.named(projectDir, invokedName);
      return location === undefined ? ALLOWED : yield* checkSkill(projectDir, location);
    });

    const checkFileRead = Effect.fn('SkillGate.checkFileRead')(function* (
      projectDir        ,
      cwd        ,
      filePath        ,
    ) {
      const location = yield* locator.containing(projectDir, path.resolve(cwd, filePath));
      return location === undefined ? ALLOWED : yield* checkSkill(projectDir, location);
    });

    return { checkSkill, checkInvocation, checkFileRead, projectRootOf: locator.projectRootOf };
  }),
}) {
  static          Layer = Layer.effect(this)(this.make).pipe(
    Layer.provide(Layer.mergeAll(SkillFiles.Layer, SkillLocator.Layer, TrustRegistryStore.Layer)),
  );
}
