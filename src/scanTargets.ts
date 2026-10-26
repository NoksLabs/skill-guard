import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative } from 'node:path';

import { listSkillFiles, readSkillFile } from './skillFiles.ts';
import { allSkills, type SkillLocation } from './skillRoots.ts';

export type TargetFile = {
  readonly file: string;
  readonly content: Buffer;
  readonly escapesRoot: string | undefined;
};

export type ScanTarget = {
  readonly id: string;
  readonly scope: 'project' | 'user' | 'plugin' | 'file';
  readonly path: string;
  readonly files: ReadonlyArray<TargetFile>;
  readonly skill: SkillLocation | undefined;
};

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

const filesUnder = (path: string): ReadonlyArray<string> =>
  !existsSync(path)
    ? []
    : statSync(path).isDirectory()
      ? readdirSync(path)
          .filter((name) => !SKIPPED_DIRS.has(name) && name !== '.DS_Store')
          .flatMap((name) => filesUnder(join(path, name)))
      : [path];

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

export const skillTarget = (projectDir: string, skill: SkillLocation): ScanTarget => ({
  id: skill.id,
  scope: skill.scope,
  path: displayPath(projectDir, skill.dir),
  skill,
  files: listSkillFiles(skill.dir).map((file) => ({
    file: file.relativePath,
    content: readSkillFile(file),
    escapesRoot: escapesRootOf(
      file.linkTarget,
      skill.scope === 'project' ? projectDir : skill.realDir,
    ),
  })),
});

const fileTarget = (projectDir: string, path: string): ScanTarget => ({
  id: `file:${displayPath(projectDir, path)}`,
  scope: 'file',
  path: displayPath(projectDir, path),
  skill: undefined,
  files: [
    { file: displayPath(projectDir, path), content: readFileSync(path), escapesRoot: undefined },
  ],
});

export const defaultTargets = (projectDir: string): ReadonlyArray<ScanTarget> => [
  ...allSkills(projectDir).map((skill) => skillTarget(projectDir, skill)),
  ...[...PROJECT_FILE_ROOTS.map((root) => join(projectDir, root)), ...USER_FILE_ROOTS()]
    .flatMap(filesUnder)
    .map((path) => fileTarget(projectDir, path)),
];

export const pathTargets = (projectDir: string, path: string): ReadonlyArray<ScanTarget> => {
  const skill = allSkills(projectDir).find(
    (location) => location.dir === path || location.realDir === path || location.id === path,
  );
  return skill === undefined
    ? filesUnder(path).map((file) => fileTarget(projectDir, file))
    : [skillTarget(projectDir, skill)];
};

const SCANNED_PREFIXES: ReadonlyArray<string> = [
  '.agents/skills/',
  '.claude/skills/',
  '.pi/',
  ...PROJECT_FILE_ROOTS,
];

const stagedPaths = (projectDir: string): ReadonlyArray<string> =>
  execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'], {
    cwd: projectDir,
    encoding: 'utf8',
  })
    .split('\0')
    .filter((path) => path.length > 0)
    .filter((path) =>
      SCANNED_PREFIXES.some(
        (prefix) =>
          path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`),
      ),
    );

const stagedContent = (projectDir: string, path: string): Buffer =>
  execFileSync('git', ['show', `:${path}`], { cwd: projectDir, maxBuffer: 64 * 1024 * 1024 });

export const stagedTargets = (projectDir: string): ReadonlyArray<ScanTarget> =>
  stagedPaths(projectDir).map((path) => {
    const skillMatch = /^\.(agents|claude)\/skills\/([^/]+)\/(.+)$/.exec(path);
    return skillMatch === null
      ? {
          id: `file:${path}`,
          scope: 'file',
          path,
          skill: undefined,
          files: [{ file: path, content: stagedContent(projectDir, path), escapesRoot: undefined }],
        }
      : {
          id: skillMatch[2] ?? path,
          scope: 'project',
          path,
          skill: undefined,
          files: [
            {
              file: skillMatch[3] ?? path,
              content: stagedContent(projectDir, path),
              escapesRoot: undefined,
            },
          ],
        };
  });
