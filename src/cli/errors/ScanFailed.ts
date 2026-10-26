import * as Data from 'effect/Data';
import * as Runtime from 'effect/Runtime';

export class ScanFailed extends Data.TaggedError('ScanFailed') {
  override readonly [Runtime.errorExitCode] = 1;
  override readonly [Runtime.errorReported] = false;
}
