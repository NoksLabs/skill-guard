import * as NodeRuntime from '@effect/platform-node/NodeRuntime';
import * as NodeServices from '@effect/platform-node/NodeServices';
import * as Cause from 'effect/Cause';
import * as Console from 'effect/Console';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as FileSystem from 'effect/FileSystem';
import * as Option from 'effect/Option';
import * as Runtime from 'effect/Runtime';
import * as Schema from 'effect/Schema';
import { Argument, CliError, Command, Flag } from 'effect/cli';
import { resolve } from 'node:path';

import pkg from '../package.json' with { type: 'json' };
import {               scanContent } from './scanFiles.js';
                                               
import { defaultTargets, pathTargets,                  stagedTargets } from './scanTargets.js';
import { runSetup } from './setup.js';
import { hashSkillDir } from './skillFiles.js';
import {
  isAccepted,
  loadRegistry,
  projectRegistryPath,
  saveRegistry,
                  
  userRegistryPath,
} from './trustRegistry.js';

class ScanFailed extends Data.TaggedError('ScanFailed') {
  ;                 [Runtime.errorExitCode] = 1;
  ;                 [Runtime.errorReported] = false;
}

class UsageError extends Data.TaggedError('UsageError')                               {
  ;                 [Runtime.errorExitCode] = 2;
  ;                 [Runtime.errorReported] = false;
}

const usageError = (message        ) =>
  Console.error(message).pipe(Effect.andThen(new UsageError({ message })));

const projectDir = Effect.sync(() => resolve(process.env['SKILL_GUARD_PROJECT_DIR'] ?? process.cwd()));

const registryPathFor = (projectDir        , user         )         =>
  user ? userRegistryPath() : projectRegistryPath(projectDir);

const now = Effect.sync(() => new Date().toISOString());

const SEVERITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 }                                            ;

                   
                              
                                            
                                         
                                              
  

const entryFor = (projectDir        , id        ) =>
  Effect.gen(function* () {
    const project = yield* loadRegistry(projectRegistryPath(projectDir));
    const user = yield* loadRegistry(userRegistryPath());
    return project.entries[id] ?? user.entries[id];
  });

const scanTarget = (projectDir        , target            ) =>
  Effect.gen(function* () {
    const scanned = yield* Effect.forEach(target.files, (file) => scanContent(file));
    const findings = scanned
      .flat()
      .toSorted(
        (a, b) =>
          SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
          a.file.localeCompare(b.file) ||
          a.line - b.line,
      );
    const entry = yield* entryFor(projectDir, target.id);
    const unaccepted = findings.filter(
      (finding) => !isAccepted(finding, entry?.acceptedFindings ?? []),
    );
    const result             = { target, findings, entry, unaccepted };
    return result;
  });

const trustState = (result            ) =>
  Effect.gen(function* () {
    if (result.target.skill === undefined) {
      return result.target.scope === 'file' ? 'file' : 'staged';
    }
    const current = yield* hashSkillDir(result.target.skill.dir);
    const entry = result.entry;
    return entry === undefined
      ? 'UNAPPROVED'
      : entry.status === 'blocked'
        ? 'BLOCKED'
        : entry.status === 'approved' && entry.sha256 === current
          ? 'approved'
          : entry.status === 'approved'
            ? 'CHANGED'
            : 'UNAPPROVED';
  });

const printResult = (result            , verbose         ) =>
  Effect.gen(function* () {
    const counts = (severity          ) =>
      result.unaccepted.filter((finding) => finding.severity === severity).length;
    const shown = result.unaccepted.filter((finding) => verbose || finding.severity !== 'LOW');
    const accepted = result.findings.length - result.unaccepted.length;
    const state = yield* trustState(result);
    yield* Console.log(
      `\n== ${result.target.id} [${state}] ${result.target.path}  HIGH ${counts('HIGH')} · MEDIUM ${counts('MEDIUM')} · LOW ${counts('LOW')}${accepted > 0 ? ` · accepted ${accepted}` : ''}`,
    );
    yield* Effect.forEach(shown, (finding) =>
      Console.log(
        `  ${finding.severity.padEnd(6)} ${finding.rule.padEnd(18)} ${finding.file}:${finding.line}  ${finding.message}${finding.excerpt === '' ? '' : `  «${finding.excerpt}»`}`,
      ),
    );
  });

const hasUnacceptedHigh = (result            )          =>
  result.unaccepted.some((finding) => finding.severity === 'HIGH');

const runScan = (options   
                                         
                        
                            
                           
 ) =>
  Effect.gen(function* () {
    const dir = yield* projectDir;
    const targets = options.staged
      ? yield* stagedTargets(dir)
      : Option.isNone(options.target)
        ? yield* defaultTargets(dir)
        : yield* pathTargets(
            dir,
            options.target.value.includes('/') ? resolve(options.target.value) : options.target.value,
          );
    const results = yield* Effect.forEach(targets, (target) => scanTarget(dir, target), {
      concurrency: 8,
    });
    yield* Effect.forEach(
      results.filter(
        (result) => options.all || result.findings.length > 0 || result.target.skill !== undefined,
      ),
      (result) => printResult(result, options.verbose),
    );
    const blocking = results.filter(hasUnacceptedHigh);
    yield* Console.log(
      `\n${results.length} targets scanned; ${blocking.length} with unaccepted HIGH findings.`,
    );
    if (blocking.length > 0) {
      return yield* new ScanFailed();
    }
  });

const SkillsLock = Schema.fromJsonString(
  Schema.NullOr(
    Schema.Struct({
      skills: Schema.optionalKey(
        Schema.Record(Schema.String, Schema.Struct({ source: Schema.optionalKey(Schema.String) })),
      ),
    }),
  ),
);

const decodeSkillsLock = Schema.decodeUnknownEffect(SkillsLock);

const lockedSource = (projectDir        , id        , explicit                       ) =>
  Effect.gen(function* () {
    if (Option.isSome(explicit)) {
      const [repo, commit] = explicit.value.split('@');
      return { repo: repo ?? explicit.value, commit: commit ?? 'unpinned' };
    }
    const fs = yield* FileSystem.FileSystem;
    const lockPath = resolve(projectDir, 'skills-lock.json');
    if (!(yield* fs.exists(lockPath))) {
      return null;
    }
    const lock = yield* decodeSkillsLock(yield* fs.readFileString(lockPath));
    const repo = lock?.skills?.[id]?.source;
    return repo === undefined ? null : { repo, commit: 'unpinned' };
  });

const updateEntry = (
  registryPath        ,
  id        ,
  update                                               ,
) =>
  Effect.gen(function* () {
    const registry = yield* loadRegistry(registryPath);
    yield* saveRegistry(registryPath, {
      ...registry,
      entries: { ...registry.entries, [id]: update(registry.entries[id]) },
    });
    yield* Console.log(`${id}: written to ${registryPath}`);
  });

const singleTarget = (projectDir        , id        ) =>
  id.startsWith('file:')
    ? pathTargets(projectDir, resolve(projectDir, id.slice(5))).pipe(
        Effect.map((targets) => targets.at(0)),
      )
    : defaultTargets(projectDir).pipe(
        Effect.map((targets) => targets.find((target) => target.id === id)),
      );

const baseEntry = (
  projectDir        ,
  target            ,
  existing                        ,
  source                       ,
) =>
  Effect.gen(function* () {
    const entry             = {
      scope: target.scope,
      path: target.path,
      source: existing?.source ?? (yield* lockedSource(projectDir, target.id, source)),
      sha256: existing?.sha256 ?? '',
      status: existing?.status ?? 'pending',
      scannedAt: yield* now,
      approvedAt: existing?.approvedAt ?? null,
      acceptedFindings: existing?.acceptedFindings ?? [],
    };
    return entry;
  });

const userFlag = Flag.Boolean('user').pipe(
  Flag.withDescription('Write the user registry (~/.agents/skills-trust.json) instead of the project one'),
  Flag.withDefault(false),
);

const idArgument = Argument.String('id').pipe(Argument.withDescription('Skill id, as listed by scan'));

const scan = Command.make(
  'scan',
  {
    target: Argument.String('target').pipe(
      Argument.withDescription('A skill id or a path to a skill or file tree'),
      Argument.optional,
    ),
    all: Flag.Boolean('all').pipe(Flag.withDescription('Print every target, not only skills and targets with findings'), Flag.withDefault(false)),
    verbose: Flag.Boolean('verbose').pipe(Flag.withDescription('Include LOW findings'), Flag.withDefault(false)),
    staged: Flag.Boolean('staged').pipe(Flag.withDescription('Scan the blobs staged in git'), Flag.withDefault(false)),
  },
  runScan,
).pipe(Command.withDescription('Scan skills and agent files for risky content'));

const approve = Command.make(
  'approve',
  {
    id: idArgument,
    source: Flag.String('source').pipe(Flag.withDescription('Skill origin as owner/repo@commit'), Flag.optional),
    user: userFlag,
  },
  Effect.fn(function* ({ id, source, user }) {
    const dir = yield* projectDir;
    const target = yield* singleTarget(dir, id);
    if (target === undefined || target.skill === undefined) {
      return yield* usageError(`Unknown skill: ${id}. Run \`skill-guard scan\` to list skill ids.`);
    }
    const skillDir = target.skill.dir;
    const result = yield* scanTarget(dir, target);
    yield* printResult(result, false);
    const high = result.unaccepted.filter((finding) => finding.severity === 'HIGH');
    if (high.length > 0) {
      yield* Console.error(
        `\nRefusing to approve ${id}: ${high.length} unaccepted HIGH finding(s). Review them, then accept each with \`skill-guard accept ${id} <rule> <file>\` or fix the skill.`,
      );
      return yield* new ScanFailed();
    }
    const sha256 = yield* hashSkillDir(skillDir);
    const approvedAt = yield* now;
    const registry = yield* loadRegistry(registryPathFor(dir, user));
    const entry = yield* baseEntry(dir, target, registry.entries[id], source);
    yield* updateEntry(registryPathFor(dir, user), id, () => ({
      ...entry,
      sha256,
      status: 'approved',
      approvedAt,
    }));
  }),
).pipe(Command.withDescription('Record approval of the skill at its current content hash'));

const accept = Command.make(
  'accept',
  {
    id: idArgument,
    rule: Argument.String('rule').pipe(Argument.withDescription('Rule id of the finding')),
    file: Argument.String('file').pipe(Argument.withDescription('File the finding was reported in')),
    note: Flag.String('note').pipe(Flag.withDescription('Why the finding is acceptable'), Flag.withDefault('')),
    user: userFlag,
  },
  Effect.fn(function* ({ id, rule, file, note, user }) {
    const dir = yield* projectDir;
    const target = yield* singleTarget(dir, id);
    const finding =
      target === undefined
        ? undefined
        : (yield* scanTarget(dir, target)).findings.find(
            (item) => item.rule === rule && item.file === file,
          );
    if (target === undefined || finding === undefined) {
      return yield* usageError(`No current finding ${rule} in ${file} for ${id}.`);
    }
    const acceptedAt = yield* now;
    const registry = yield* loadRegistry(registryPathFor(dir, user));
    const entry = yield* baseEntry(dir, target, registry.entries[id], Option.none());
    yield* updateEntry(registryPathFor(dir, user), id, () => ({
      ...entry,
      acceptedFindings: [
        ...entry.acceptedFindings.filter(
          (item) => !(item.rule === finding.rule && item.file === finding.file),
        ),
        { rule: finding.rule, file: finding.file, fileSha256: finding.fileSha256, note, acceptedAt },
      ],
    }));
  }),
).pipe(Command.withDescription('Record one reviewed finding as accepted'));

const block = Command.make(
  'block',
  { id: idArgument, user: userFlag },
  Effect.fn(function* ({ id, user }) {
    const dir = yield* projectDir;
    const target = yield* singleTarget(dir, id);
    if (target === undefined) {
      return yield* usageError(`Unknown target: ${id}`);
    }
    const registry = yield* loadRegistry(registryPathFor(dir, user));
    const entry = yield* baseEntry(dir, target, registry.entries[id], Option.none());
    yield* updateEntry(registryPathFor(dir, user), id, () => ({
      ...entry,
      status: 'blocked',
      approvedAt: null,
    }));
  }),
).pipe(Command.withDescription('Mark the skill as blocked so the gate never loads it'));

const setup = Command.make(
  'setup',
  {
    apply: Flag.Boolean('apply').pipe(Flag.withDescription('Write the changes instead of printing them'), Flag.withDefault(false)),
  },
  ({ apply }) => runSetup(apply),
).pipe(Command.withDescription('Install the user-level Claude Code hook and Pi extension'));

const root = Command.make('skill-guard', {}, () =>
  runScan({ target: Option.none(), all: false, verbose: false, staged: false }),
).pipe(
  Command.withDescription(pkg.description),
  Command.withSubcommands([scan, approve, accept, block, setup]),
);

const teardown                   = (exit, onExit) => {
  if (Exit.isFailure(exit)) {
    const error = Cause.squash(exit.cause);
    if (CliError.isCliError(error)) {
      return onExit(error._tag === 'ShowHelp' && error.errors.length === 0 ? 0 : 2);
    }
  }
  return Runtime.defaultTeardown(exit, onExit);
};

root.pipe(
  Command.run({ version: pkg.version }),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain({ teardown }),
);
