import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { Finding } from './scanFiles.ts';

export type AcceptedFinding = {
  readonly rule: string;
  readonly file: string;
  readonly fileSha256: string;
  readonly note: string;
  readonly acceptedAt: string;
};

export type TrustEntry = {
  readonly scope: 'project' | 'user' | 'plugin' | 'file';
  readonly path: string;
  readonly source: { readonly repo: string; readonly commit: string } | null;
  readonly sha256: string;
  readonly status: 'approved' | 'pending' | 'blocked';
  readonly scannedAt: string;
  readonly approvedAt: string | null;
  readonly acceptedFindings: ReadonlyArray<AcceptedFinding>;
};

export type TrustRegistry = {
  readonly version: 1;
  readonly entries: Readonly<Record<string, TrustEntry>>;
};

const EMPTY_REGISTRY: TrustRegistry = { version: 1, entries: {} };

export const projectRegistryPath = (projectDir: string): string =>
  join(projectDir, '.agents', 'skills-trust.json');

export const userRegistryPath = (): string => join(homedir(), '.agents', 'skills-trust.json');

export const loadRegistry = (path: string): TrustRegistry => {
  const parsed: Partial<TrustRegistry> | null = existsSync(path)
    ? JSON.parse(readFileSync(path, 'utf8'))
    : EMPTY_REGISTRY;
  return parsed?.entries === undefined ? EMPTY_REGISTRY : { version: 1, entries: parsed.entries };
};

export const saveRegistry = (path: string, registry: TrustRegistry): void =>
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        version: 1,
        entries: Object.fromEntries(
          Object.entries(registry.entries).toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        ),
      },
      null,
      2,
    )}\n`,
  );

export const isAccepted = (finding: Finding, accepted: ReadonlyArray<AcceptedFinding>): boolean =>
  accepted.some(
    (entry) =>
      entry.rule === finding.rule &&
      entry.file === finding.file &&
      entry.fileSha256 === finding.fileSha256,
  );

export type TrustDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: string };

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
