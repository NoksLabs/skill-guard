import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Path from 'effect/Path';
import * as Schema from 'effect/Schema';
                                                           
import { homedir } from 'node:os';
import { join } from 'node:path';

                                              

export const AcceptedFinding = Schema.Struct({
  rule: Schema.String,
  file: Schema.String,
  fileSha256: Schema.String,
  note: Schema.String,
  acceptedAt: Schema.String,
});

                                                          

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

                                                

export const TrustRegistry = Schema.Struct({
  version: Schema.Literal(1),
  entries: Schema.Record(Schema.String, TrustEntry),
});

                                                      

const decodeRegistry = Schema.decodeUnknownEffect(Schema.fromJsonString(TrustRegistry));

const EMPTY_REGISTRY                = { version: 1, entries: {} };

export const projectRegistryPath = (projectDir        )         =>
  join(projectDir, '.agents', 'skills-trust.json');

export const userRegistryPath = ()         => join(homedir(), '.agents', 'skills-trust.json');

export const loadRegistry = (
  path        ,
)                                                                                                        =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    if (!(yield* fs.exists(path))) {
      return EMPTY_REGISTRY;
    }
    return yield* decodeRegistry(yield* fs.readFileString(path));
  });

export const saveRegistry = (
  path        ,
  registry               ,
)                                                                                      =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const pathService = yield* Path.Path;
    const sorted                = {
      version: 1,
      entries: Object.fromEntries(
        Object.entries(registry.entries).toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
      ),
    };
    yield* fs.makeDirectory(pathService.dirname(path), { recursive: true });
    yield* fs.writeFileString(path, `${JSON.stringify(sorted, null, 2)}\n`);
  });

export const isAccepted = (finding         , accepted                                )          =>
  accepted.some(
    (entry) =>
      entry.rule === finding.rule &&
      entry.file === finding.file &&
      entry.fileSha256 === finding.fileSha256,
  );

                           
                              
                                                         

export const decideTrust = (p   
                      
                                 
                                                          
                               
 )                => {
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
