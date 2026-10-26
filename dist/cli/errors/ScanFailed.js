import * as Data from 'effect/Data';
import * as Runtime from 'effect/Runtime';

export class ScanFailed extends Data.TaggedError('ScanFailed') {
  ;                 [Runtime.errorExitCode] = 1;
  ;                 [Runtime.errorReported] = false;
}
