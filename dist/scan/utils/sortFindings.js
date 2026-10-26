import { SEVERITY_ORDER } from '../constants/SeverityOrder.js';
                                                   

export const sortFindings = (findings                        )                         =>
  findings.toSorted(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.file.localeCompare(b.file) ||
      a.line - b.line,
  );
