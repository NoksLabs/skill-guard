import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Option from 'effect/Option';
import * as Path from 'effect/Path';

                                                                 
import { decodeSkillsLock } from './decoders/decodeSkillsLock.js';

export const lockedSource = Effect.fn('LockedSource.of')(function* (
  projectDir        ,
  id        ,
  explicit                       ,
) {
  if (Option.isSome(explicit)) {
    const [repo, commit] = explicit.value.split('@');
    const source                       = {
      repo: repo ?? explicit.value,
      commit: commit ?? 'unpinned',
    };
    return source;
  }
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const lockPath = path.resolve(projectDir, 'skills-lock.json');
  if (!(yield* fs.exists(lockPath))) {
    return null;
  }
  const lock = yield* decodeSkillsLock(yield* fs.readFileString(lockPath));
  const repo = lock?.skills?.[id]?.source;
  return repo === undefined ? null : { repo, commit: 'unpinned' };
});
