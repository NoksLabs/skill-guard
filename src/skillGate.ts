import { resolve } from 'node:path';

import { hashSkillDir } from './skillFiles.ts';
import { type SkillLocation, skillContaining, skillNamed } from './skillRoots.ts';
import {
  decideTrust,
  loadRegistry,
  projectRegistryPath,
  type TrustDecision,
  userRegistryPath,
} from './trustRegistry.ts';

const ALLOWED: TrustDecision = { allowed: true };

const approveHintFor = (location: SkillLocation): string =>
  location.scope === 'project'
    ? `skill-guard approve ${location.id}`
    : `skill-guard approve ${location.id} --user`;

export const checkSkill = (projectDir: string, location: SkillLocation): TrustDecision => {
  const project = loadRegistry(projectRegistryPath(projectDir)).entries;
  const user = location.scope === 'project' ? {} : loadRegistry(userRegistryPath()).entries;
  return decideTrust({
    id: location.id,
    currentSha256: hashSkillDir(location.dir),
    entries: [project[location.id], user[location.id]],
    approveHint: approveHintFor(location),
  });
};

export const checkSkillInvocation = (projectDir: string, invokedName: string): TrustDecision => {
  const location = skillNamed(projectDir, invokedName);
  return location === undefined ? ALLOWED : checkSkill(projectDir, location);
};

export const checkSkillFileRead = (
  projectDir: string,
  cwd: string,
  filePath: string,
): TrustDecision => {
  const location = skillContaining(projectDir, resolve(cwd, filePath));
  return location === undefined ? ALLOWED : checkSkill(projectDir, location);
};

export const slashSkillName = (prompt: string, prefix: string): string | undefined => {
  const trimmed = prompt.trimStart();
  if (!trimmed.startsWith(prefix)) {
    return undefined;
  }
  const name = trimmed.slice(prefix.length).split(/\s/, 1)[0] ?? '';
  return /^[\w.-]+(:[\w.-]+)?$/.test(name) ? name : undefined;
};
