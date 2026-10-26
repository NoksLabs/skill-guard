import type * as Crypto from 'effect/Crypto';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import type * as Path from 'effect/Path';
import type * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import type * as PlatformError from 'effect/PlatformError';
import { ChildProcess, ChildProcessSpawner } from 'effect/process';
import { homedir } from 'node:os';
import { join, relative } from 'node:path';

import { concatBytes, listSkillFiles, readSkillFile } from './skillFiles.ts';
import { allSkills, type SkillLocation } from './skillRoots.ts';

export type TargetFile = {
  readonly file: string;
  readonly content: Uint8Array;
  readonly escapesRoot: string | undefined;
};

export type ScanTarget = {
  readonly id: string;
  readonly scope: 'project' | 'user' | 'plugin' | 'file';
  readonly path: string;
  readonly files: ReadonlyArray<TargetFile>;
  readonly skill: SkillLocation | undefined;
};

export type TargetServices = FileSystem.FileSystem | Path.Path | Crypto.Crypto;

export type TargetFailure = PlatformError.PlatformError | Schema.SchemaError;

const PROJECT_FILE_ROOTS: ReadonlyArray<string> = [
  'AGENTS.md',
  'CLAUDE.md',
  '.claude/agents',
  '.claude/commands',
  '.claude/hooks',
  '.claude/settings.json',
  '.pi',
];

const SKIPPED_DIRS: ReadonlySet<string> = new Set(['node_modules', 'skills', '.git']);

const USER_FILE_ROOTS = (): ReadonlyArray<string> => [
  join(homedir(), '.claude', 'CLAUDE.md'),
  join(homedir(), '.claude', 'agents'),
  join(homedir(), '.claude', 'commands'),
  join(homedir(), '.pi', 'agent', 'AGENTS.md'),
  join(homedir(), '.pi', 'agent', 'prompts'),
  join(homedir(), '.pi', 'agent', 'extensions'),
];

const filesUnder = (
  path: string,
): Effect.Effect<ReadonlyArray<string>, PlatformError.PlatformError, FileSystem.FileSystem> =>
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

const displayPath = (projectDir: string, path: string): string =>
  path.startsWith(`${projectDir}/`)
    ? relative(projectDir, path)
    : path.startsWith(`${homedir()}/`)
      ? `~/${relative(homedir(), path)}`
      : path;

const escapesRootOf = (linkTarget: string | undefined, root: string): string | undefined =>
  linkTarget === undefined || linkTarget.startsWith(`${root}/`) || linkTarget === root
    ? undefined
    : linkTarget;

export const skillTarget = (
  projectDir: string,
  skill: SkillLocation,
): Effect.Effect<ScanTarget, PlatformError.PlatformError, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const files = yield* listSkillFiles(skill.dir);
    const targetFiles = yield* Effect.forEach(files, (file) =>
      readSkillFile(file).pipe(
        Effect.map(
          (content): TargetFile => ({
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
  projectDir: string,
  path: string,
): Effect.Effect<ScanTarget, PlatformError.PlatformError, FileSystem.FileSystem> =>
  FileSystem.FileSystem.use((fs) =>
    fs.readFile(path).pipe(
      Effect.map((content) => ({
        id: `file:${displayPath(projectDir, path)}`,
        scope: 'file' as const,
        path: displayPath(projectDir, path),
        skill: undefined,
        files: [{ file: displayPath(projectDir, path), content, escapesRoot: undefined }],
      })),
    ),
  );

export const defaultTargets = (
  projectDir: string,
): Effect.Effect<ReadonlyArray<ScanTarget>, TargetFailure, TargetServices> =>
  Effect.gen(function* () {
    const skills = yield* allSkills(projectDir);
    const skillTargets = yield* Effect.forEach(skills, (skill) => skillTarget(projectDir, skill));
    const roots = [...PROJECT_FILE_ROOTS.map((root) => join(projectDir, root)), ...USER_FILE_ROOTS()];
    const files = (yield* Effect.forEach(roots, filesUnder)).flat();
    const fileTargets = yield* Effect.forEach(files, (file) => fileTarget(projectDir, file));
    return [...skillTargets, ...fileTargets];
  });

export const pathTargets = (
  projectDir: string,
  path: string,
): Effect.Effect<ReadonlyArray<ScanTarget>, TargetFailure, TargetServices> =>
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

const SCANNED_PREFIXES: ReadonlyArray<string> = [
  '.agents/skills/',
  '.claude/skills/',
  '.pi/',
  ...PROJECT_FILE_ROOTS,
];

const git = (projectDir: string, args: ReadonlyArray<string>) =>
  ChildProcess.make('git', args, { cwd: projectDir });

const stagedPaths = (
  projectDir: string,
): Effect.Effect<ReadonlyArray<string>, PlatformError.PlatformError, ChildProcessSpawner.ChildProcessSpawner> =>
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
  projectDir: string,
  path: string,
): Effect.Effect<Uint8Array, PlatformError.PlatformError, ChildProcessSpawner.ChildProcessSpawner> =>
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
  projectDir: string,
): Effect.Effect<ReadonlyArray<ScanTarget>, PlatformError.PlatformError, ChildProcessSpawner.ChildProcessSpawner> =>
  stagedPaths(projectDir).pipe(
    Effect.flatMap((paths) =>
      Effect.forEach(paths, (path) =>
        stagedContent(projectDir, path).pipe(
          Effect.map((content): ScanTarget => {
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
