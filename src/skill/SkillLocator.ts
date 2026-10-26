import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Layer from 'effect/Layer';
import * as Path from 'effect/Path';

import { Environment } from '../shared/Environment.ts';
import {
  INSTALLED_PLUGINS_FILE,
  PROJECT_SKILL_ROOTS,
  USER_SKILL_ROOTS,
} from './constants/SkillRoots.ts';
import { decodeInstalledPlugins } from './decoders/decodeInstalledPlugins.ts';
import type { SkillLocation } from './types/SkillLocation.ts';
import type { SkillScope } from './types/SkillScope.ts';
import { isDirectory } from './utils/isDirectory.ts';
import { uniqueByRealDir } from './utils/uniqueByRealDir.ts';

export class SkillLocator extends Context.Service<SkillLocator>()(
  'skill-guard/skill/SkillLocator',
  {
    make: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const env = yield* Environment;

      const skillsIn = Effect.fn('SkillLocator.skillsIn')(function* (
        root: string,
        scope: SkillScope,
        idOf: (name: string) => string,
      ) {
        if (!(yield* isDirectory(fs, root))) {
          return [];
        }
        const names = (yield* fs.readDirectory(root)).filter((name) => !name.startsWith('.'));
        const located = yield* Effect.forEach(names, (name) =>
          Effect.gen(function* () {
            const dir = path.join(root, name);
            if (!(yield* isDirectory(fs, dir)) || !(yield* fs.exists(path.join(dir, 'SKILL.md')))) {
              return [];
            }
            const location: SkillLocation = {
              id: idOf(name),
              name,
              scope,
              dir,
              realDir: yield* fs.realPath(dir),
            };
            return [location];
          }),
        );
        return located.flat();
      });

      const pluginInstallDirs = Effect.gen(function* () {
        const file = path.join(env.home, ...INSTALLED_PLUGINS_FILE);
        if (!(yield* fs.exists(file))) {
          return [];
        }
        const parsed = yield* decodeInstalledPlugins(yield* fs.readFileString(file));
        return Object.entries(parsed?.plugins ?? {}).flatMap(([key, installs]) =>
          installs.flatMap((install) =>
            install.installPath === undefined
              ? []
              : [{ plugin: key.split('@')[0] ?? key, dir: install.installPath }],
          ),
        );
      });

      const pluginSkills = pluginInstallDirs.pipe(
        Effect.flatMap((installs) =>
          Effect.forEach(installs, ({ plugin, dir }) =>
            skillsIn(path.join(dir, 'skills'), 'plugin', (name) => `plugin:${plugin}:${name}`),
          ),
        ),
        Effect.map((located) => located.flat()),
      );

      const projectSkills = Effect.fn('SkillLocator.projectSkills')(function* (projectDir: string) {
        const located = yield* Effect.forEach(PROJECT_SKILL_ROOTS, (segments) =>
          skillsIn(path.join(projectDir, ...segments), 'project', (name) => name),
        );
        return uniqueByRealDir(located.flat());
      });

      const userSkills = Effect.forEach(USER_SKILL_ROOTS, (segments) =>
        skillsIn(path.join(env.home, ...segments), 'user', (name) => `user:${name}`),
      ).pipe(Effect.map((located) => uniqueByRealDir(located.flat())));

      const allSkills = Effect.fn('SkillLocator.allSkills')(function* (projectDir: string) {
        const groups = yield* Effect.all([projectSkills(projectDir), userSkills, pluginSkills]);
        return groups.flat();
      });

      const projectRootOf = Effect.fn('SkillLocator.projectRootOf')(function* (cwd: string) {
        const start = path.resolve(cwd);
        const ancestors = start
          .split('/')
          .map((_part, index, parts) => parts.slice(0, parts.length - index).join('/') || '/');
        for (const dir of ancestors) {
          if (yield* fs.exists(path.join(dir, '.git'))) {
            return dir;
          }
        }
        return start;
      });

      const containing = Effect.fn('SkillLocator.containing')(function* (
        projectDir: string,
        filePath: string,
      ) {
        const real = (yield* fs.exists(filePath))
          ? yield* fs.realPath(filePath)
          : path.resolve(filePath);
        return (yield* allSkills(projectDir)).find(
          (location) =>
            real.startsWith(`${location.realDir}/`) || real.startsWith(`${location.dir}/`),
        );
      });

      const named = Effect.fn('SkillLocator.named')(function* (
        projectDir: string,
        invoked: string,
      ) {
        const parts = invoked.split(':');
        const skillName = parts.at(-1) ?? invoked;
        const plugin = parts.length === 2 ? parts[0] : undefined;
        if (plugin !== undefined) {
          return (yield* pluginSkills).find(
            (location) => location.id === `plugin:${plugin}:${skillName}`,
          );
        }
        const project = (yield* projectSkills(projectDir)).find(
          (location) => location.name === skillName,
        );
        return project ?? (yield* userSkills).find((location) => location.name === skillName);
      });

      return {
        projectSkills,
        userSkills,
        pluginSkills,
        allSkills,
        projectRootOf,
        containing,
        named,
      };
    }),
  },
) {
  static readonly Layer = Layer.effect(this)(this.make).pipe(Layer.provide(Environment.Layer));
}
