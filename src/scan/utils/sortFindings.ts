import { SEVERITY_ORDER } from '../constants/SeverityOrder.ts';
import type { Finding } from '../types/Finding.ts';

export const sortFindings = (findings: ReadonlyArray<Finding>): ReadonlyArray<Finding> =>
  findings.toSorted(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.file.localeCompare(b.file) ||
      a.line - b.line,
  );
