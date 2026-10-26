import type { Severity } from '../types/Severity.ts';

export const everywhere = (severity: Severity) => ({
  prose: severity,
  code: severity,
  config: severity,
});
