import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export type SkillScope = 'project' | 'user' | 'plugin';

export type SkillLocation = {
  readonly id: string;
  readonly name: string;
  readonly scope: SkillScope;
  readonly dir: string;
  readonly realDir: string;
};

const isDirectory = (path: string): boolean => existsSync(path) && statSync(path).isDirectory();

const hasSkillFile = (dir: string): boolean => existsSync(join(dir, 'SKILL.md'));

export const projectRootOf = (cwd: string): string => {
  const start = resolve(cwd);
  const ancestors = start
    .split('/')
    .map((_part, index, parts) => parts.slice(0, parts.length - index).join('/') || '/');
  return ancestors.find((dir) => existsSync(join(dir, '.git'))) ?? start;
};

export const projectSkillRoots = (projectDir: string): ReadonlyArray<string> => [
  join(projectDir, '.agents', 'skills'),
  join(projectDir, '.claude', 'skills'),
  join(projectDir, '.pi', 'skills'),
];

export const userSkillRoots = (): ReadonlyArray<string> => [
  join(homedir(), '.claude', 'skills'),
  join(homedir(), '.agents', 'skills'),
  join(homedir(), '.pi', 'agent', 'skills'),
];

const skillsIn = (root: string, scope: SkillScope, idOf: (name: string) => string) =>
  isDirectory(root)
    ? readdirSync(root)
        .filter((name) => !name.startsWith('.'))
        .map((name) => join(root, name))
        .filter((dir) => isDirectory(dir) && hasSkillFile(dir))
        .map((dir): SkillLocation => ({
          id: idOf(dir.slice(root.length + 1)),
          name: dir.slice(root.length + 1),
          scope,
          dir,
          realDir: realpathSync(dir),
        }))
    : [];

type PluginInstall = { readonly installPath?: string };

type InstalledPlugins = {
  readonly plugins?: Readonly<Record<string, ReadonlyArray<PluginInstall>>>;
};

const pluginInstallDirs = (): ReadonlyArray<{ readonly plugin: string; readonly dir: string }> => {
  const file = join(homedir(), '.claude', 'plugins', 'installed_plugins.json');
  const parsed: InstalledPlugins | null = existsSync(file)
    ? JSON.parse(readFileSync(file, 'utf8'))
    : {};
  const plugins = parsed?.plugins ?? {};
  return Object.entries(plugins).flatMap(([key, installs]) =>
    installs.flatMap((install) =>
      install.installPath === undefined
        ? []
        : [{ plugin: key.split('@')[0] ?? key, dir: install.installPath }],
    ),
  );
};

export const pluginSkills = (): ReadonlyArray<SkillLocation> =>
  pluginInstallDirs().flatMap(({ plugin, dir }) =>
    skillsIn(join(dir, 'skills'), 'plugin', (name) => `plugin:${plugin}:${name}`),
  );

const uniqueByRealDir = (locations: ReadonlyArray<SkillLocation>): ReadonlyArray<SkillLocation> =>
  locations.filter(
    (location, index) =>
      locations.findIndex(
        (other) => other.id === location.id && other.realDir === location.realDir,
      ) === index,
  );

export const projectSkills = (projectDir: string): ReadonlyArray<SkillLocation> =>
  uniqueByRealDir(
    projectSkillRoots(projectDir).flatMap((root) => skillsIn(root, 'project', (name) => name)),
  );

export const userSkills = (): ReadonlyArray<SkillLocation> =>
  uniqueByRealDir(
    userSkillRoots().flatMap((root) => skillsIn(root, 'user', (name) => `user:${name}`)),
  );

export const allSkills = (projectDir: string): ReadonlyArray<SkillLocation> => [
  ...projectSkills(projectDir),
  ...userSkills(),
  ...pluginSkills(),
];

export const skillContaining = (
  projectDir: string,
  filePath: string,
): SkillLocation | undefined => {
  const real = existsSync(filePath) ? realpathSync(filePath) : resolve(filePath);
  return allSkills(projectDir).find(
    (location) => real.startsWith(`${location.realDir}/`) || real.startsWith(`${location.dir}/`),
  );
};

export const skillNamed = (projectDir: string, invoked: string): SkillLocation | undefined => {
  const parts = invoked.split(':');
  const skillName = parts.at(-1) ?? invoked;
  const plugin = parts.length === 2 ? parts[0] : undefined;
  return plugin === undefined
    ? (projectSkills(projectDir).find((location) => location.name === skillName) ??
        userSkills().find((location) => location.name === skillName))
    : pluginSkills().find((location) => location.id === `plugin:${plugin}:${skillName}`);
};
