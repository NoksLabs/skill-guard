import { Command } from 'effect/cli';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { TrustRegistryStore } from '../trust/TrustRegistryStore.ts';
import { idArgument } from './params/idArgument.ts';
import { userFlag } from './params/userFlag.ts';
import { writeEntry } from './RegistryWriter.ts';
import { singleTarget } from './SingleTarget.ts';
import { draftEntry } from './TrustEntryDraft.ts';
import { projectDir } from './utils/projectDir.ts';
import { registryPathFor } from './utils/registryPathFor.ts';
import { usageError } from './utils/usageError.ts';

export const blockCommand = Command.make(
  'block',
  { id: idArgument, user: userFlag },
  Effect.fn(function* ({ id, user }) {
    const dir = yield* projectDir;
    const target = yield* singleTarget(dir, id);
    if (target === undefined) {
      return yield* usageError(`Unknown target: ${id}`);
    }
    const registry = yield* TrustRegistryStore;
    const registryPath = yield* registryPathFor(dir, user);
    const existing = (yield* registry.load(registryPath)).entries[id];
    const entry = yield* draftEntry(dir, target, existing, Option.none());
    return yield* writeEntry(registryPath, id, () => ({
      ...entry,
      status: 'blocked',
      approvedAt: null,
    }));
  }),
).pipe(Command.withDescription('Mark the skill as blocked so the gate never loads it'));
