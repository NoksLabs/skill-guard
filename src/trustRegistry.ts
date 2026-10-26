import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Path from 'effect/Path';
import * as Schema from 'effect/Schema';
import type * as PlatformError from 'effect/PlatformError';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { Finding } from './scanFiles.ts';

export const AcceptedFinding = Schema.Struct({
  rule: Schema.String,
  file: Schema.String,
  fileSha256: Schema.String,
  note: Schema.String,
  acceptedAt: Schema.String,
});

export type AcceptedFinding = typeof AcceptedFinding.Type;

export const TrustEntry = Schema.Struct({
  scope: Schema.Literals(['project', 'user', 'plugin', 'file']),
  path: Schema.String,
  source: Schema.NullOr(Schema.Struct({ repo: Schema.String, commit: Schema.String })),
  sha256: Schema.String,
  status: Schema.Literals(['approved', 'pending', 'blocked']),
  scannedAt: Schema.String,
  approvedAt: Schema.NullOr(Schema.String),
  acceptedFindings: Schema.Array(AcceptedFinding),
});

export type TrustEntry = typeof TrustEntry.Type;

export const TrustRegistry = Schema.Struct({
  version: Schema.Literal(1),
  entries: Schema.Record(Schema.String, TrustEntry),
});

export type TrustRegistry = typeof TrustRegistry.Type;

const decodeRegistry = Schema.decodeUnknownEffect(Schema.fromJsonString(TrustRegistry));

const EMPTY_REGISTRY: TrustRegistry = { version: 1, entries: {} };

export const projectRegistryPath = (projectDir: string): string =>
  join(projectDir, '.agents', 'skills-trust.json');

export const userRegistryPath = (): string => join(homedir(), '.agents', 'skills-trust.json');

export const loadRegistry = (
  path: string,
): Effect.Effect<TrustRegistry, Schema.SchemaError | PlatformError.PlatformError, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    if (!(yield* fs.exists(path))) {
      return EMPTY_REGISTRY;
    }
    return yield* decodeRegistry(yield* fs.readFileString(path));
  });

export const saveRegistry = (
  path: string,
  registry: TrustRegistry,
): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const pathService = yield* Path.Path;
    const sorted: TrustRegistry = {
      version: 1,
      entries: Object.fromEntries(
        Object.entries(registry.entries).toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
      ),
    };
    yield* fs.makeDirectory(pathService.dirname(path), { recursive: true });
    yield* fs.writeFileString(path, `${JSON.stringify(sorted, null, 2)}\n`);
  });

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
