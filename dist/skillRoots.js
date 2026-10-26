import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

                                                       

                             
                      
                        
                             
                       
                           
  

const isDirectory = (path        )          => existsSync(path) && statSync(path).isDirectory();

const hasSkillFile = (dir        )          => existsSync(join(dir, 'SKILL.md'));

export const projectRootOf = (cwd        )         => {
  const start = resolve(cwd);
  const ancestors = start
    .split('/')
    .map((_part, index, parts) => parts.slice(0, parts.length - index).join('/') || '/');
  return ancestors.find((dir) => existsSync(join(dir, '.git'))) ?? start;
};

export const projectSkillRoots = (projectDir        )                        => [
  join(projectDir, '.agents', 'skills'),
  join(projectDir, '.claude', 'skills'),
  join(projectDir, '.pi', 'skills'),
];

export const userSkillRoots = ()                        => [
  join(homedir(), '.claude', 'skills'),
  join(homedir(), '.agents', 'skills'),
  join(homedir(), '.pi', 'agent', 'skills'),
];

const skillsIn = (root        , scope            , idOf                          ) =>
  isDirectory(root)
    ? readdirSync(root)
        .filter((name) => !name.startsWith('.'))
        .map((name) => join(root, name))
        .filter((dir) => isDirectory(dir) && hasSkillFile(dir))
        .map((dir)                => ({
          id: idOf(dir.slice(root.length + 1)),
          name: dir.slice(root.length + 1),
          scope,
          dir,
          realDir: realpathSync(dir),
        }))
    : [];

                                                       

                         
                                                                            
  

const pluginInstallDirs = ()                                                                   => {
  const file = join(homedir(), '.claude', 'plugins', 'installed_plugins.json');
  const parsed                          = existsSync(file)
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

export const pluginSkills = ()                               =>
  pluginInstallDirs().flatMap(({ plugin, dir }) =>
    skillsIn(join(dir, 'skills'), 'plugin', (name) => `plugin:${plugin}:${name}`),
  );

const uniqueByRealDir = (locations                              )                               =>
  locations.filter(
    (location, index) =>
      locations.findIndex(
        (other) => other.id === location.id && other.realDir === location.realDir,
      ) === index,
  );

export const projectSkills = (projectDir        )                               =>
  uniqueByRealDir(
    projectSkillRoots(projectDir).flatMap((root) => skillsIn(root, 'project', (name) => name)),
  );

export const userSkills = ()                               =>
  uniqueByRealDir(
    userSkillRoots().flatMap((root) => skillsIn(root, 'user', (name) => `user:${name}`)),
  );

export const allSkills = (projectDir        )                               => [
  ...projectSkills(projectDir),
  ...userSkills(),
  ...pluginSkills(),
];

export const skillContaining = (
  projectDir        ,
  filePath        ,
)                            => {
  const real = existsSync(filePath) ? realpathSync(filePath) : resolve(filePath);
  return allSkills(projectDir).find(
    (location) => real.startsWith(`${location.realDir}/`) || real.startsWith(`${location.dir}/`),
  );
};

export const skillNamed = (projectDir        , invoked        )                            => {
  const parts = invoked.split(':');
  const skillName = parts.at(-1) ?? invoked;
  const plugin = parts.length === 2 ? parts[0] : undefined;
  return plugin === undefined
    ? (projectSkills(projectDir).find((location) => location.name === skillName) ??
        userSkills().find((location) => location.name === skillName))
    : pluginSkills().find((location) => location.id === `plugin:${plugin}:${skillName}`);
};
