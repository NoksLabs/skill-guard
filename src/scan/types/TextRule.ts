import type { FileKind } from './FileKind.ts';
import type { Severity } from './Severity.ts';

export type TextRule = {
  readonly id: string;
  readonly pattern: RegExp;
  readonly severity: Readonly<Record<FileKind, Severity | undefined>>;
  readonly message: string;
};
