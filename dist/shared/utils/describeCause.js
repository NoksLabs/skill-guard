import * as Cause from 'effect/Cause';

export const describeCause = (cause                      )         => {
  const error = Cause.squash(cause);
  return error instanceof Error ? error.message : String(error);
};
