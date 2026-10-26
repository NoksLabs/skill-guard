import type { Finding } from '../../scan/types/Finding.ts';
import type { AcceptedFinding } from '../schemas/AcceptedFinding.ts';

export const isAccepted = (finding: Finding, accepted: ReadonlyArray<AcceptedFinding>): boolean =>
  accepted.some(
    (entry) =>
      entry.rule === finding.rule &&
      entry.file === finding.file &&
      entry.fileSha256 === finding.fileSha256,
  );
