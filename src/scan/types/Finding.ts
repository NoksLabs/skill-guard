import type { Severity } from './Severity.ts';

export type Finding = {
  readonly rule: string;
  readonly severity: Severity;
  readonly file: string;
  readonly line: number;
  readonly message: string;
  readonly excerpt: string;
  readonly fileSha256: string;
};
