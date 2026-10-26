import { Command, Flag } from 'effect/cli';
import * as Effect from 'effect/Effect';

import { SetupInstaller } from '../setup/SetupInstaller.js';

export const setupCommand = Command.make(
  'setup',
  {
    apply: Flag.Boolean('apply').pipe(
      Flag.withDescription('Write the changes instead of printing them'),
      Flag.withDefault(false),
    ),
  },
  Effect.fn(function* ({ apply }) {
    const installer = yield* SetupInstaller;
    yield* installer.run(apply);
  }),
).pipe(Command.withDescription('Install the user-level Claude Code hook and Pi extension'));
