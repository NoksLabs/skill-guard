import { Argument, Command, Flag } from 'effect/cli';

import { runScan } from './RunScan.ts';

export const scanCommand = Command.make(
  'scan',
  {
    target: Argument.String('target').pipe(
      Argument.withDescription('A skill id or a path to a skill or file tree'),
      Argument.optional,
    ),
    all: Flag.Boolean('all').pipe(
      Flag.withDescription('Print every target, not only skills and targets with findings'),
      Flag.withDefault(false),
    ),
    verbose: Flag.Boolean('verbose').pipe(
      Flag.withDescription('Include LOW findings'),
      Flag.withDefault(false),
    ),
    staged: Flag.Boolean('staged').pipe(
      Flag.withDescription('Scan the blobs staged in git'),
      Flag.withDefault(false),
    ),
  },
  runScan,
).pipe(Command.withDescription('Scan skills and agent files for risky content'));
