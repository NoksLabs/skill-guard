import type * as Crypto from 'effect/Crypto';
import * as Effect from 'effect/Effect';
import type * as FileSystem from 'effect/FileSystem';
import type * as Path from 'effect/Path';
import type * as Schema from 'effect/Schema';
import type * as PlatformError from 'effect/PlatformError';
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

export type GateServices = FileSystem.FileSystem | Path.Path | Crypto.Crypto;

export type GateFailure = PlatformError.PlatformError | Schema.SchemaError;

const ALLOWED: TrustDecision = { allowed: true };

const approveHintFor = (location: SkillLocation): string =>
  location.scope === 'project'
    ? `skill-guard approve ${location.id}`
    : `skill-guard approve ${location.id} --user`;

export const checkSkill = (
  projectDir: string,
  location: SkillLocation,
): Effect.Effect<TrustDecision, GateFailure, GateServices> =>
  Effect.gen(function* () {
    const project = (yield* loadRegistry(projectRegistryPath(projectDir))).entries;
    const user =
      location.scope === 'project' ? {} : (yield* loadRegistry(userRegistryPath())).entries;
    return decideTrust({
      id: location.id,
      currentSha256: yield* hashSkillDir(location.dir),
      entries: [project[location.id], user[location.id]],
      approveHint: approveHintFor(location),
    });
  });

export const checkSkillInvocation = (
  projectDir: string,
  invokedName: string,
): Effect.Effect<TrustDecision, GateFailure, GateServices> =>
  skillNamed(projectDir, invokedName).pipe(
    Effect.flatMap((location) =>
      location === undefined ? Effect.succeed(ALLOWED) : checkSkill(projectDir, location),
    ),
  );

export const checkSkillFileRead = (
  projectDir: string,
  cwd: string,
  filePath: string,
): Effect.Effect<TrustDecision, GateFailure, GateServices> =>
  skillContaining(projectDir, resolve(cwd, filePath)).pipe(
    Effect.flatMap((location) =>
      location === undefined ? Effect.succeed(ALLOWED) : checkSkill(projectDir, location),
    ),
  );

export const slashSkillName = (prompt: string, prefix: string): string | undefined => {
  const trimmed = prompt.trimStart();
  if (!trimmed.startsWith(prefix)) {
    return undefined;
  }
  const name = trimmed.slice(prefix.length).split(/\s/, 1)[0] ?? '';
  return /^[\w.-]+(:[\w.-]+)?$/.test(name) ? name : undefined;
};
