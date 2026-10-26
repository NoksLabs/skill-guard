import * as Data from 'effect/Data';
import * as Runtime from 'effect/Runtime';

export class UsageError extends Data.TaggedError('UsageError')                               {
  ;                 [Runtime.errorExitCode] = 2;
  ;                 [Runtime.errorReported] = false;
}
