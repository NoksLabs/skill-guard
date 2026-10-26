import * as Cause from 'effect/Cause';
import { CliError, Command } from 'effect/cli';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import * as Runtime from 'effect/Runtime';

import pkg from '../../package.json' with { type: 'json' };
import { acceptCommand } from './AcceptCommand.ts';
import { approveCommand } from './ApproveCommand.ts';
import { blockCommand } from './BlockCommand.ts';
import { runScan } from './RunScan.ts';
import { scanCommand } from './ScanCommand.ts';
import { setupCommand } from './SetupCommand.ts';

const root = Command.make('skill-guard', {}, () =>
  runScan({ target: Option.none(), all: false, verbose: false, staged: false }),
).pipe(
  Command.withDescription(pkg.description),
  Command.withSubcommands([scanCommand, approveCommand, acceptCommand, blockCommand, setupCommand]),
);

export const teardown: Runtime.Teardown = (exit, onExit) => {
  if (Exit.isFailure(exit)) {
    const error = Cause.squash(exit.cause);
    if (CliError.isCliError(error)) {
      return onExit(error._tag === 'ShowHelp' && error.errors.length === 0 ? 0 : 2);
    }
  }
  return Runtime.defaultTeardown(exit, onExit);
};

export const cli = Command.run(root, { version: pkg.version });
