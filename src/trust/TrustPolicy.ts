import type { TrustEntry } from './schemas/TrustEntry.ts';
import type { TrustDecision } from './types/TrustDecision.ts';

export const decideTrust = (p: {
  readonly id: string;
  readonly currentSha256: string;
  readonly entries: ReadonlyArray<TrustEntry | undefined>;
  readonly approveHint: string;
}): TrustDecision => {
  const known = p.entries.filter((entry) => entry !== undefined);
  if (known.some((entry) => entry.status === 'blocked')) {
    return { allowed: false, reason: `Skill "${p.id}" is blocked in the skills trust registry.` };
  }
  if (known.some((entry) => entry.status === 'approved' && entry.sha256 === p.currentSha256)) {
    return { allowed: true };
  }
  return !known.some((entry) => entry.status === 'approved')
    ? {
        allowed: false,
        reason: `Skill "${p.id}" is not approved. Scan and review it, then run \`${p.approveHint}\`.`,
      }
    : {
        allowed: false,
        reason: `Skill "${p.id}" changed since it was approved (content hash differs). Re-scan, review the diff, then run \`${p.approveHint}\` again.`,
      };
};
