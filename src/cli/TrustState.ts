import * as Effect from 'effect/Effect';

import { SkillFiles } from '../skill/SkillFiles.ts';
import type { ScanResult } from './types/ScanResult.ts';

export const trustState = Effect.fn('TrustState.of')(function* (result: ScanResult) {
  if (result.target.skill === undefined) {
    return result.target.scope === 'file' ? 'file' : 'staged';
  }
  const skillFiles = yield* SkillFiles;
  const current = yield* skillFiles.hashDir(result.target.skill.dir);
  const entry = result.entry;
  return entry === undefined
    ? 'UNAPPROVED'
    : entry.status === 'blocked'
      ? 'BLOCKED'
      : entry.status === 'approved' && entry.sha256 === current
        ? 'approved'
        : entry.status === 'approved'
          ? 'CHANGED'
          : 'UNAPPROVED';
});
