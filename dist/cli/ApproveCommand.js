import { Command, Flag } from 'effect/cli';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { isoNow } from '../shared/utils/isoNow.js';
import { SkillFiles } from '../skill/SkillFiles.js';
import { TrustRegistryStore } from '../trust/TrustRegistryStore.js';
import { ScanFailed } from './errors/ScanFailed.js';
import { idArgument } from './params/idArgument.js';
import { userFlag } from './params/userFlag.js';
import { writeEntry } from './RegistryWriter.js';
import { printResult } from './ScanReport.js';
import { reviewTarget } from './ScanReview.js';
import { singleTarget } from './SingleTarget.js';
import { draftEntry } from './TrustEntryDraft.js';
import { projectDir } from './utils/projectDir.js';
import { registryPathFor } from './utils/registryPathFor.js';
import { usageError } from './utils/usageError.js';

export const approveCommand = Command.make(
  'approve',
  {
    id: idArgument,
    source: Flag.String('source').pipe(
      Flag.withDescription('Skill origin as owner/repo@commit'),
      Flag.optional,
    ),
    user: userFlag,
  },
  Effect.fn(function* ({ id, source, user }) {
    const dir = yield* projectDir;
    const target = yield* singleTarget(dir, id);
    if (target === undefined || target.skill === undefined) {
      return yield* usageError(`Unknown skill: ${id}. Run \`skill-guard scan\` to list skill ids.`);
    }
    const skillDir = target.skill.dir;
    const result = yield* reviewTarget(dir, target);
    yield* printResult(result, false);
    const high = result.unaccepted.filter((finding) => finding.severity === 'HIGH');
    if (high.length > 0) {
      yield* Console.error(
        `\nRefusing to approve ${id}: ${high.length} unaccepted HIGH finding(s). Review them, then accept each with \`skill-guard accept ${id} <rule> <file>\` or fix the skill.`,
      );
      return yield* new ScanFailed();
    }
    const skillFiles = yield* SkillFiles;
    const registry = yield* TrustRegistryStore;
    const sha256 = yield* skillFiles.hashDir(skillDir);
    const approvedAt = yield* isoNow;
    const registryPath = yield* registryPathFor(dir, user);
    const existing = (yield* registry.load(registryPath)).entries[id];
    const entry = yield* draftEntry(dir, target, existing, source);
    return yield* writeEntry(registryPath, id, () => ({
      ...entry,
      sha256,
      status: 'approved',
      approvedAt,
    }));
  }),
).pipe(Command.withDescription('Record approval of the skill at its current content hash'));
