import * as Data from 'effect/Data';
import * as Runtime from 'effect/Runtime';

export class GateFailure extends Data.TaggedError('GateFailure') {
  override readonly [Runtime.errorExitCode] = 2;
  override readonly [Runtime.errorReported] = false;
}
