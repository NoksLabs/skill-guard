import type { Finding } from '../../scan/types/Finding.ts';
import type { ScanTarget } from '../../scan/types/ScanTarget.ts';
import type { TrustEntry } from '../../trust/schemas/TrustEntry.ts';

export type ScanResult = {
  readonly target: ScanTarget;
  readonly findings: ReadonlyArray<Finding>;
  readonly entry: TrustEntry | undefined;
  readonly unaccepted: ReadonlyArray<Finding>;
};
