import { Argument, Command, Flag } from 'effect/cli';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { isoNow } from '../shared/utils/isoNow.ts';
import { TrustRegistryStore } from '../trust/TrustRegistryStore.ts';
import { idArgument } from './params/idArgument.ts';
import { userFlag } from './params/userFlag.ts';
import { writeEntry } from './RegistryWriter.ts';
import { reviewTarget } from './ScanReview.ts';
import { singleTarget } from './SingleTarget.ts';
import { draftEntry } from './TrustEntryDraft.ts';
import { projectDir } from './utils/projectDir.ts';
import { registryPathFor } from './utils/registryPathFor.ts';
import { usageError } from './utils/usageError.ts';

export const acceptCommand = Command.make(
  'accept',
  {
    id: idArgument,
    rule: Argument.String('rule').pipe(Argument.withDescription('Rule id of the finding')),
    file: Argument.String('file').pipe(
      Argument.withDescription('File the finding was reported in'),
    ),
    note: Flag.String('note').pipe(
      Flag.withDescription('Why the finding is acceptable'),
      Flag.withDefault(''),
    ),
    user: userFlag,
  },
  Effect.fn(function* ({ id, rule, file, note, user }) {
    const dir = yield* projectDir;
    const target = yield* singleTarget(dir, id);
    const finding =
      target === undefined
        ? undefined
        : (yield* reviewTarget(dir, target)).findings.find(
            (item) => item.rule === rule && item.file === file,
          );
    if (target === undefined || finding === undefined) {
      return yield* usageError(`No current finding ${rule} in ${file} for ${id}.`);
    }
    const registry = yield* TrustRegistryStore;
    const acceptedAt = yield* isoNow;
    const registryPath = yield* registryPathFor(dir, user);
    const existing = (yield* registry.load(registryPath)).entries[id];
    const entry = yield* draftEntry(dir, target, existing, Option.none());
    return yield* writeEntry(registryPath, id, () => ({
      ...entry,
      acceptedFindings: [
        ...entry.acceptedFindings.filter(
          (item) => !(item.rule === finding.rule && item.file === finding.file),
        ),
        {
          rule: finding.rule,
          file: finding.file,
          fileSha256: finding.fileSha256,
          note,
          acceptedAt,
        },
      ],
    }));
  }),
).pipe(Command.withDescription('Record one reviewed finding as accepted'));
