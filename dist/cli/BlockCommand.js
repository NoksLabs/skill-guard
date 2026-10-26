import { Command } from 'effect/cli';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { TrustRegistryStore } from '../trust/TrustRegistryStore.js';
import { idArgument } from './params/idArgument.js';
import { userFlag } from './params/userFlag.js';
import { writeEntry } from './RegistryWriter.js';
import { singleTarget } from './SingleTarget.js';
import { draftEntry } from './TrustEntryDraft.js';
import { projectDir } from './utils/projectDir.js';
import { registryPathFor } from './utils/registryPathFor.js';
import { usageError } from './utils/usageError.js';

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
