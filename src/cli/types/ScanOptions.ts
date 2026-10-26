import type * as Option from 'effect/Option';

export type ScanOptions = {
  readonly target: Option.Option<string>;
  readonly all: boolean;
  readonly verbose: boolean;
  readonly staged: boolean;
};
