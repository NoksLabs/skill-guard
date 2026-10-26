import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Path from 'effect/Path';

import { SkillFiles } from '../skill/SkillFiles.ts';
import { SkillLocator } from '../skill/SkillLocator.ts';
import type { SkillLocation } from '../skill/types/SkillLocation.ts';
import { decideTrust } from '../trust/TrustPolicy.ts';
import { TrustRegistryStore } from '../trust/TrustRegistryStore.ts';
import type { TrustDecision } from '../trust/types/TrustDecision.ts';

const ALLOWED: TrustDecision = { allowed: true };

const approveHintFor = (location: SkillLocation): string =>
  location.scope === 'project'
    ? `skill-guard approve ${location.id}`
    : `skill-guard approve ${location.id} --user`;

export class SkillGate extends Context.Service<SkillGate>()('skill-guard/gate/SkillGate', {
  make: Effect.gen(function* () {
    const path = yield* Path.Path;
    const skillFiles = yield* SkillFiles;
    const locator = yield* SkillLocator;
    const registry = yield* TrustRegistryStore;

    const checkSkill = Effect.fn('SkillGate.checkSkill')(function* (
      projectDir: string,
      location: SkillLocation,
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
      projectDir: string,
      invokedName: string,
    ) {
      const location = yield* locator.named(projectDir, invokedName);
      return location === undefined ? ALLOWED : yield* checkSkill(projectDir, location);
    });

    const checkFileReads = Effect.fn('SkillGate.checkFileReads')(function* (
      projectDir: string,
      cwd: string,
      filePaths: ReadonlyArray<string>,
    ) {
      const location = yield* locator.containingAny(
        projectDir,
        filePaths.map((filePath) => path.resolve(cwd, filePath)),
      );
      return location === undefined ? ALLOWED : yield* checkSkill(projectDir, location);
    });

    const checkFileRead = (projectDir: string, cwd: string, filePath: string) =>
      checkFileReads(projectDir, cwd, [filePath]);

    return {
      checkSkill,
      checkInvocation,
      checkFileRead,
      checkFileReads,
      projectRootOf: locator.projectRootOf,
    };
  }),
}) {
  static readonly Layer = Layer.effect(this)(this.make).pipe(
    Layer.provide(Layer.mergeAll(SkillFiles.Layer, SkillLocator.Layer, TrustRegistryStore.Layer)),
  );
}
