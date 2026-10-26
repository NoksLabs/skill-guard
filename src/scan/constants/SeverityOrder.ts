import type { Severity } from '../types/Severity.ts';

export const SEVERITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 } satisfies Record<Severity, number>;
