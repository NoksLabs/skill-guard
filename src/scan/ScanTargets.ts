import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Layer from 'effect/Layer';
import * as Path from 'effect/Path';
import type * as PlatformError from 'effect/PlatformError';

import { Environment } from '../shared/Environment.ts';
import { SkillFiles } from '../skill/SkillFiles.ts';
import { SkillLocator } from '../skill/SkillLocator.ts';
import type { SkillLocation } from '../skill/types/SkillLocation.ts';
import { PROJECT_FILE_ROOTS, SKIPPED_DIRS, USER_FILE_ROOTS } from './constants/ScanRoots.ts';
import { StagedBlobs } from './StagedBlobs.ts';
import type { ScanTarget } from './types/ScanTarget.ts';
import type { TargetFile } from './types/TargetFile.ts';
import { displayPath } from './utils/displayPath.ts';
import { escapesRootOf } from './utils/escapesRootOf.ts';

const stagedTarget = (path: string, content: Uint8Array): ScanTarget => {
  const skillMatch = /^\.(agents|claude)\/skills\/([^/]+)\/(.+)$/.exec(path);
  return skillMatch === null
    ? {
        id: `file:${path}`,
        scope: 'file',
        path,
        skill: undefined,
        files: [{ file: path, content, escapesRoot: undefined }],
      }
    : {
        id: skillMatch[2] ?? path,
        scope: 'project',
        path,
        skill: undefined,
        files: [{ file: skillMatch[3] ?? path, content, escapesRoot: undefined }],
      };
};

export class ScanTargets extends Context.Service<ScanTargets>()('skill-guard/scan/ScanTargets', {
  make: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const env = yield* Environment;
    const skillFiles = yield* SkillFiles;
    const locator = yield* SkillLocator;
    const staged = yield* StagedBlobs;

    const shown = (projectDir: string, target: string): string =>
      displayPath(path, env.home, projectDir, target);

    const filesUnder = (
      dir: string,
    ): Effect.Effect<ReadonlyArray<string>, PlatformError.PlatformError> =>
      Effect.gen(function* () {
        if (!(yield* fs.exists(dir))) {
          return [];
        }
        if ((yield* fs.stat(dir)).type !== 'Directory') {
          return [dir];
        }
        const names = (yield* fs.readDirectory(dir)).filter(
          (name) => !SKIPPED_DIRS.has(name) && name !== '.DS_Store',
        );
        const nested = yield* Effect.forEach(names, (name) => filesUnder(path.join(dir, name)));
        return nested.flat();
      });

    const skillTarget = Effect.fn('ScanTargets.skillTarget')(function* (
      projectDir: string,
      skill: SkillLocation,
    ) {
      const files = yield* skillFiles.list(skill.dir);
      const targetFiles = yield* Effect.forEach(files, (file) =>
        skillFiles.read(file).pipe(
          Effect.map((content): TargetFile => ({
            file: file.relativePath,
            content,
            escapesRoot: escapesRootOf(
              file.linkTarget,
              skill.scope === 'project' ? projectDir : skill.realDir,
            ),
          })),
        ),
      );
      const target: ScanTarget = {
        id: skill.id,
        scope: skill.scope,
        path: shown(projectDir, skill.dir),
        skill,
        files: targetFiles,
      };
      return target;
    });

    const fileTarget = Effect.fn('ScanTargets.fileTarget')(function* (
      projectDir: string,
      file: string,
    ) {
      const content = yield* fs.readFile(file);
      const display = shown(projectDir, file);
      const target: ScanTarget = {
        id: `file:${display}`,
        scope: 'file',
        path: display,
        skill: undefined,
        files: [{ file: display, content, escapesRoot: undefined }],
      };
      return target;
    });

    const defaults = Effect.fn('ScanTargets.defaults')(function* (projectDir: string) {
      const skills = yield* locator.allSkills(projectDir);
      const skillTargets = yield* Effect.forEach(skills, (skill) => skillTarget(projectDir, skill));
      const roots = [
        ...PROJECT_FILE_ROOTS.map((root) => path.join(projectDir, root)),
        ...USER_FILE_ROOTS.map((segments) => path.join(env.home, ...segments)),
      ];
      const files = (yield* Effect.forEach(roots, filesUnder)).flat();
      const fileTargets = yield* Effect.forEach(files, (file) => fileTarget(projectDir, file));
      return [...skillTargets, ...fileTargets];
    });

    const forPath = Effect.fn('ScanTargets.forPath')(function* (
      projectDir: string,
      target: string,
    ) {
      const skill = (yield* locator.allSkills(projectDir)).find(
        (location) =>
          location.dir === target || location.realDir === target || location.id === target,
      );
      if (skill !== undefined) {
        return [yield* skillTarget(projectDir, skill)];
      }
      const files = yield* filesUnder(target);
      return yield* Effect.forEach(files, (file) => fileTarget(projectDir, file));
    });

    const stagedTargets = Effect.fn('ScanTargets.staged')(function* (projectDir: string) {
      const paths = yield* staged.paths(projectDir);
      return yield* Effect.forEach(paths, (file) =>
        staged.content(projectDir, file).pipe(Effect.map((content) => stagedTarget(file, content))),
      );
    });

    return { skillTarget, defaults, forPath, staged: stagedTargets };
  }),
}) {
  static readonly Layer = Layer.effect(this)(this.make).pipe(
    Layer.provide(
      Layer.mergeAll(Environment.Layer, SkillFiles.Layer, SkillLocator.Layer, StagedBlobs.Layer),
    ),
  );
}
