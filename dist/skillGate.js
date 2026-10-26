                                             
import * as Effect from 'effect/Effect';
                                                     
                                         
                                             
                                                           
import { resolve } from 'node:path';

import { hashSkillDir } from './skillFiles.js';
import {                     skillContaining, skillNamed } from './skillRoots.js';
import {
  decideTrust,
  loadRegistry,
  projectRegistryPath,
                     
  userRegistryPath,
} from './trustRegistry.js';

                                                                             

                                                                           

const ALLOWED                = { allowed: true };

const approveHintFor = (location               )         =>
  location.scope === 'project'
    ? `skill-guard approve ${location.id}`
    : `skill-guard approve ${location.id} --user`;

export const checkSkill = (
  projectDir        ,
  location               ,
)                                                          =>
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
  projectDir        ,
  invokedName        ,
)                                                          =>
  skillNamed(projectDir, invokedName).pipe(
    Effect.flatMap((location) =>
      location === undefined ? Effect.succeed(ALLOWED) : checkSkill(projectDir, location),
    ),
  );

export const checkSkillFileRead = (
  projectDir        ,
  cwd        ,
  filePath        ,
)                                                          =>
  skillContaining(projectDir, resolve(cwd, filePath)).pipe(
    Effect.flatMap((location) =>
      location === undefined ? Effect.succeed(ALLOWED) : checkSkill(projectDir, location),
    ),
  );

export const slashSkillName = (prompt        , prefix        )                     => {
  const trimmed = prompt.trimStart();
  if (!trimmed.startsWith(prefix)) {
    return undefined;
  }
  const name = trimmed.slice(prefix.length).split(/\s/, 1)[0] ?? '';
  return /^[\w.-]+(:[\w.-]+)?$/.test(name) ? name : undefined;
};
