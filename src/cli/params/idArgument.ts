import { Argument } from 'effect/cli';

export const idArgument = Argument.String('id').pipe(
  Argument.withDescription('Skill id, as listed by scan'),
);
