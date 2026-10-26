import * as Data from 'effect/Data';
import * as Runtime from 'effect/Runtime';

export class GateFailure extends Data.TaggedError('GateFailure') {
  ;                 [Runtime.errorExitCode] = 2;
  ;                 [Runtime.errorReported] = false;
}
