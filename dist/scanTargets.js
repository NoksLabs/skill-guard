                                             
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
                                         
                                             
import * as Stream from 'effect/Stream';
                                                           
import { ChildProcess, ChildProcessSpawner } from 'effect/process';
import { homedir } from 'node:os';
import { join, relative } from 'node:path';

import { concatBytes, listSkillFiles, readSkillFile } from './skillFiles.js';
import { allSkills,                    } from './skillRoots.js';

                          
                        
                               
                                           
  

                          
                      
                                                         
                        
                                            
                                            
  

                                                                               

                                                                             

const PROJECT_FILE_ROOTS                        = [
  'AGENTS.md',
  'CLAUDE.md',
  '.claude/agents',
  '.claude/commands',
  '.claude/hooks',
  '.claude/settings.json',
  '.pi',
];

const SKIPPED_DIRS                      = new Set(['node_modules', 'skills', '.git']);

const USER_FILE_ROOTS = ()                        => [
  join(homedir(), '.claude', 'CLAUDE.md'),
  join(homedir(), '.claude', 'agents'),
  join(homedir(), '.claude', 'commands'),
  join(homedir(), '.pi', 'agent', 'AGENTS.md'),
  join(homedir(), '.pi', 'agent', 'prompts'),
  join(homedir(), '.pi', 'agent', 'extensions'),
];

const filesUnder = (
  path        ,
)                                                                                           =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    if (!(yield* fs.exists(path))) {
      return [];
    }
    if ((yield* fs.stat(path)).type !== 'Directory') {
      return [path];
    }
    const names = (yield* fs.readDirectory(path)).filter(
      (name) => !SKIPPED_DIRS.has(name) && name !== '.DS_Store',
    );
    const nested = yield* Effect.forEach(names, (name) => filesUnder(join(path, name)));
    return nested.flat();
  });

const displayPath = (projectDir        , path        )         =>
  path.startsWith(`${projectDir}/`)
    ? relative(projectDir, path)
    : path.startsWith(`${homedir()}/`)
      ? `~/${relative(homedir(), path)}`
      : path;

const escapesRootOf = (linkTarget                    , root        )                     =>
  linkTarget === undefined || linkTarget.startsWith(`${root}/`) || linkTarget === root
    ? undefined
    : linkTarget;

export const skillTarget = (
  projectDir        ,
  skill               ,
)                                                                                            =>
  Effect.gen(function* () {
    const files = yield* listSkillFiles(skill.dir);
    const targetFiles = yield* Effect.forEach(files, (file) =>
      readSkillFile(file).pipe(
        Effect.map(
          (content)             => ({
            file: file.relativePath,
            content,
            escapesRoot: escapesRootOf(
              file.linkTarget,
              skill.scope === 'project' ? projectDir : skill.realDir,
            ),
          }),
        ),
      ),
    );
    return { id: skill.id, scope: skill.scope, path: displayPath(projectDir, skill.dir), skill, files: targetFiles };
  });

const fileTarget = (
  projectDir        ,
  path        ,
)                                                                                =>
  FileSystem.FileSystem.use((fs) =>
    fs.readFile(path).pipe(
      Effect.map((content) => ({
        id: `file:${displayPath(projectDir, path)}`,
        scope: 'file'         ,
        path: displayPath(projectDir, path),
        skill: undefined,
        files: [{ file: displayPath(projectDir, path), content, escapesRoot: undefined }],
      })),
    ),
  );

export const defaultTargets = (
  projectDir        ,
)                                                                          =>
  Effect.gen(function* () {
    const skills = yield* allSkills(projectDir);
    const skillTargets = yield* Effect.forEach(skills, (skill) => skillTarget(projectDir, skill));
    const roots = [...PROJECT_FILE_ROOTS.map((root) => join(projectDir, root)), ...USER_FILE_ROOTS()];
    const files = (yield* Effect.forEach(roots, filesUnder)).flat();
    const fileTargets = yield* Effect.forEach(files, (file) => fileTarget(projectDir, file));
    return [...skillTargets, ...fileTargets];
  });

export const pathTargets = (
  projectDir        ,
  path        ,
)                                                                          =>
  Effect.gen(function* () {
    const skill = (yield* allSkills(projectDir)).find(
      (location) => location.dir === path || location.realDir === path || location.id === path,
    );
    if (skill !== undefined) {
      return [yield* skillTarget(projectDir, skill)];
    }
    const files = yield* filesUnder(path);
    return yield* Effect.forEach(files, (file) => fileTarget(projectDir, file));
  });

const SCANNED_PREFIXES                        = [
  '.agents/skills/',
  '.claude/skills/',
  '.pi/',
  ...PROJECT_FILE_ROOTS,
];

const git = (projectDir        , args                       ) =>
  ChildProcess.make('git', args, { cwd: projectDir });

const stagedPaths = (
  projectDir        ,
)                                                                                                             =>
  ChildProcessSpawner.ChildProcessSpawner.use((spawner) =>
    spawner.string(git(projectDir, ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'])),
  ).pipe(
    Effect.map((output) =>
      output
        .split('\0')
        .filter((path) => path.length > 0)
        .filter((path) =>
          SCANNED_PREFIXES.some(
            (prefix) =>
              path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`),
          ),
        ),
    ),
  );

const stagedContent = (
  projectDir        ,
  path        ,
)                                                                                                  =>
  Effect.scoped(
    Effect.gen(function* () {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      const handle = yield* spawner.spawn(git(projectDir, ['show', `:${path}`]));
      const chunks = yield* Stream.runCollect(handle.stdout);
      const exitCode = yield* handle.exitCode;
      if (exitCode !== ChildProcessSpawner.ExitCode(0)) {
        return yield* Effect.die(new Error(`git show :${path} exited with ${exitCode}`));
      }
      return concatBytes(chunks);
    }),
  );

export const stagedTargets = (
  projectDir        ,
)                                                                                                                 =>
  stagedPaths(projectDir).pipe(
    Effect.flatMap((paths) =>
      Effect.forEach(paths, (path) =>
        stagedContent(projectDir, path).pipe(
          Effect.map((content)             => {
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
          }),
        ),
      ),
    ),
  );
