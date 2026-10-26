import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Path from 'effect/Path';
import * as Schema from 'effect/Schema';
                                                           
import { homedir } from 'node:os';
import { join } from 'node:path';

                                                       

                             
                      
                        
                             
                       
                           
  

                                                  

                                                                

const isDirectory = (path        )                                                                             =>
  FileSystem.FileSystem.use((fs) =>
    fs.exists(path).pipe(
      Effect.flatMap((exists) =>
        exists ? fs.stat(path).pipe(Effect.map((stats) => stats.type === 'Directory')) : Effect.succeed(false),
      ),
    ),
  );

const hasSkillFile = (dir        )                                                                             =>
  FileSystem.FileSystem.use((fs) => fs.exists(join(dir, 'SKILL.md')));

export const projectRootOf = (cwd        )                                                               =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const start = path.resolve(cwd);
    const ancestors = start
      .split('/')
      .map((_part, index, parts) => parts.slice(0, parts.length - index).join('/') || '/');
    for (const dir of ancestors) {
      if (yield* fs.exists(join(dir, '.git'))) {
        return dir;
      }
    }
    return start;
  });

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

const skillsIn = (
  root        ,
  scope            ,
  idOf                          ,
)                                                                                     =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    if (!(yield* isDirectory(root))) {
      return [];
    }
    const names = (yield* fs.readDirectory(root)).filter((name) => !name.startsWith('.'));
    const located = yield* Effect.forEach(names, (name) =>
      Effect.gen(function* () {
        const dir = join(root, name);
        if (!(yield* isDirectory(dir)) || !(yield* hasSkillFile(dir))) {
          return [];
        }
        const location                = {
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

const InstalledPlugins = Schema.fromJsonString(
  Schema.NullOr(
    Schema.Struct({
      plugins: Schema.optionalKey(
        Schema.Record(
          Schema.String,
          Schema.Array(Schema.Struct({ installPath: Schema.optionalKey(Schema.String) })),
        ),
      ),
    }),
  ),
);

const decodeInstalledPlugins = Schema.decodeUnknownEffect(InstalledPlugins);

const pluginInstallDirs                
                                                                   
          
                       
  = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const file = join(homedir(), '.claude', 'plugins', 'installed_plugins.json');
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

export const pluginSkills                                                                 =
  pluginInstallDirs.pipe(
    Effect.flatMap((installs) =>
      Effect.forEach(installs, ({ plugin, dir }) =>
        skillsIn(join(dir, 'skills'), 'plugin', (name) => `plugin:${plugin}:${name}`),
      ),
    ),
    Effect.map((located) => located.flat()),
  );

const uniqueByRealDir = (locations                              )                               =>
  locations.filter(
    (location, index) =>
      locations.findIndex(
        (other) => other.id === location.id && other.realDir === location.realDir,
      ) === index,
  );

export const projectSkills = (
  projectDir        ,
)                                                                                     =>
  Effect.forEach(projectSkillRoots(projectDir), (root) =>
    skillsIn(root, 'project', (name) => name),
  ).pipe(Effect.map((located) => uniqueByRealDir(located.flat())));

export const userSkills                                                                                     =
  Effect.forEach(userSkillRoots(), (root) =>
    skillsIn(root, 'user', (name) => `user:${name}`),
  ).pipe(Effect.map((located) => uniqueByRealDir(located.flat())));

export const allSkills = (
  projectDir        ,
)                                                                 =>
  Effect.all([projectSkills(projectDir), userSkills, pluginSkills]).pipe(
    Effect.map((groups) => groups.flat()),
  );

export const skillContaining = (
  projectDir        ,
  filePath        ,
)                                                              =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const real = (yield* fs.exists(filePath))
      ? yield* fs.realPath(filePath)
      : path.resolve(filePath);
    return (yield* allSkills(projectDir)).find(
      (location) =>
        real.startsWith(`${location.realDir}/`) || real.startsWith(`${location.dir}/`),
    );
  });

export const skillNamed = (
  projectDir        ,
  invoked        ,
)                                                              =>
  Effect.gen(function* () {
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
