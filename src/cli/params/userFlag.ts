import { Flag } from 'effect/cli';

export const userFlag = Flag.Boolean('user').pipe(
  Flag.withDescription(
    'Write the user registry (~/.agents/skills-trust.json) instead of the project one',
  ),
  Flag.withDefault(false),
);
