import * as Data from 'effect/Data';
import * as Runtime from 'effect/Runtime';

export class UsageError extends Data.TaggedError('UsageError')<{ readonly message: string }> {
  override readonly [Runtime.errorExitCode] = 2;
  override readonly [Runtime.errorReported] = false;
}
