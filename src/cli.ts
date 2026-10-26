import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { type Finding, scanContent } from './scanFiles.ts';
import type { Severity } from './scanRules.ts';
import { defaultTargets, pathTargets, type ScanTarget, stagedTargets } from './scanTargets.ts';
import { runSetup } from './setup.ts';
import { hashSkillDir } from './skillFiles.ts';
import {
  isAccepted,
  loadRegistry,
  projectRegistryPath,
  saveRegistry,
  type TrustEntry,
  type TrustRegistry,
  userRegistryPath,
} from './trustRegistry.ts';

const args = process.argv.slice(2);
const command = args[0] ?? 'scan';
const flag = (name: string): boolean => args.includes(`--${name}`);
const option = (name: string): string | undefined => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : args[index + 1];
};
const VALUE_OPTIONS: ReadonlySet<string> = new Set(['--source', '--note']);
const [firstArg, secondArg, thirdArg] = args
  .slice(1)
  .filter((arg, index, all) => !arg.startsWith('--') && !VALUE_OPTIONS.has(all[index - 1] ?? ''));

const projectDir = resolve(process.env['SKILL_GUARD_PROJECT_DIR'] ?? process.cwd());
const registryPath = flag('user') ? userRegistryPath() : projectRegistryPath(projectDir);
const now = (): string => new Date().toISOString();

const SEVERITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const satisfies Record<Severity, number>;

type ScanResult = {
  readonly target: ScanTarget;
  readonly findings: ReadonlyArray<Finding>;
  readonly entry: TrustEntry | undefined;
  readonly unaccepted: ReadonlyArray<Finding>;
};

const entryFor = (id: string): TrustEntry | undefined =>
  loadRegistry(projectRegistryPath(projectDir)).entries[id] ??
  loadRegistry(userRegistryPath()).entries[id];

const scanTarget = (target: ScanTarget): ScanResult => {
  const findings = target.files
    .flatMap((file) => scanContent(file))
    .toSorted(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
        a.file.localeCompare(b.file) ||
        a.line - b.line,
    );
  const entry = entryFor(target.id);
  const unaccepted = findings.filter(
    (finding) => !isAccepted(finding, entry?.acceptedFindings ?? []),
  );
  return { target, findings, entry, unaccepted };
};

const trustState = (result: ScanResult): string => {
  if (result.target.skill === undefined) {
    return result.target.scope === 'file' ? 'file' : 'staged';
  }
  const current = hashSkillDir(result.target.skill.dir);
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
};

const printResult = (result: ScanResult): void => {
  const counts = (severity: Severity) =>
    result.unaccepted.filter((finding) => finding.severity === severity).length;
  const shown = result.unaccepted.filter(
    (finding) => flag('verbose') || finding.severity !== 'LOW',
  );
  const accepted = result.findings.length - result.unaccepted.length;
  console.log(
    `\n== ${result.target.id} [${trustState(result)}] ${result.target.path}  HIGH ${counts('HIGH')} · MEDIUM ${counts('MEDIUM')} · LOW ${counts('LOW')}${accepted > 0 ? ` · accepted ${accepted}` : ''}`,
  );
  shown.forEach((finding) =>
    console.log(
      `  ${finding.severity.padEnd(6)} ${finding.rule.padEnd(18)} ${finding.file}:${finding.line}  ${finding.message}${finding.excerpt === '' ? '' : `  «${finding.excerpt}»`}`,
    ),
  );
};

const runScan = (): number => {
  const targets = flag('staged')
    ? stagedTargets(projectDir)
    : firstArg === undefined
      ? defaultTargets(projectDir)
      : pathTargets(projectDir, firstArg.includes('/') ? resolve(firstArg) : firstArg);
  const results = targets.map(scanTarget);
  results
    .filter(
      (result) => flag('all') || result.findings.length > 0 || result.target.skill !== undefined,
    )
    .forEach(printResult);
  const blocking = results.filter((result) =>
    result.unaccepted.some((finding) => finding.severity === 'HIGH'),
  );
  console.log(
    `\n${results.length} targets scanned; ${blocking.length} with unaccepted HIGH findings.`,
  );
  return blocking.length > 0 ? 1 : 0;
};

type SkillsLock = {
  readonly skills?: Readonly<Record<string, { readonly source?: string }>>;
};

const lockedSource = (id: string): TrustEntry['source'] => {
  const explicit = option('source');
  if (explicit !== undefined) {
    const [repo, commit] = explicit.split('@');
    return { repo: repo ?? explicit, commit: commit ?? 'unpinned' };
  }
  const lockPath = resolve(projectDir, 'skills-lock.json');
  const lock: SkillsLock | null = existsSync(lockPath)
    ? JSON.parse(readFileSync(lockPath, 'utf8'))
    : {};
  const source = Object.entries(lock?.skills ?? {}).find(([name]) => name === id)?.[1].source;
  const repo = source;
  return repo === undefined ? null : { repo, commit: 'unpinned' };
};

const updateEntry = (id: string, update: (entry: TrustEntry | undefined) => TrustEntry): void => {
  const registry: TrustRegistry = loadRegistry(registryPath);
  saveRegistry(registryPath, {
    ...registry,
    entries: { ...registry.entries, [id]: update(registry.entries[id]) },
  });
  console.log(`${id}: written to ${registryPath}`);
};

const singleTarget = (id: string): ScanTarget | undefined =>
  id.startsWith('file:')
    ? pathTargets(projectDir, resolve(projectDir, id.slice(5))).at(0)
    : defaultTargets(projectDir).find((target) => target.id === id);

const baseEntry = (target: ScanTarget, existing: TrustEntry | undefined): TrustEntry => ({
  scope: target.scope,
  path: target.path,
  source: existing?.source ?? lockedSource(target.id),
  sha256: existing?.sha256 ?? '',
  status: existing?.status ?? 'pending',
  scannedAt: now(),
  approvedAt: existing?.approvedAt ?? null,
  acceptedFindings: existing?.acceptedFindings ?? [],
});

const runApprove = (): number => {
  const id = firstArg;
  const target = id === undefined ? undefined : singleTarget(id);
  if (id === undefined || target === undefined || target.skill === undefined) {
    console.error(`Unknown skill: ${id ?? '(none)'}. Run \`skill-guard scan\` to list skill ids.`);
    return 2;
  }
  const result = scanTarget(target);
  printResult(result);
  const high = result.unaccepted.filter((finding) => finding.severity === 'HIGH');
  if (high.length > 0) {
    console.error(
      `\nRefusing to approve ${id}: ${high.length} unaccepted HIGH finding(s). Review them, then accept each with \`skill-guard accept ${id} <rule> <file>\` or fix the skill.`,
    );
    return 1;
  }
  updateEntry(id, (existing) => ({
    ...baseEntry(target, existing),
    sha256: hashSkillDir(target.skill?.dir ?? ''),
    status: 'approved',
    approvedAt: now(),
  }));
  return 0;
};

const runAccept = (): number => {
  const [id, rule, file] = [firstArg, secondArg, thirdArg];
  const target = id === undefined ? undefined : singleTarget(id);
  const finding =
    target === undefined
      ? undefined
      : scanTarget(target).findings.find((item) => item.rule === rule && item.file === file);
  if (id === undefined || target === undefined || finding === undefined) {
    console.error(`No current finding ${rule ?? '?'} in ${file ?? '?'} for ${id ?? '?'}.`);
    return 2;
  }
  updateEntry(id, (existing) => {
    const entry = baseEntry(target, existing);
    return {
      ...entry,
      acceptedFindings: [
        ...entry.acceptedFindings.filter(
          (item) => !(item.rule === finding.rule && item.file === finding.file),
        ),
        {
          rule: finding.rule,
          file: finding.file,
          fileSha256: finding.fileSha256,
          note: option('note') ?? '',
          acceptedAt: now(),
        },
      ],
    };
  });
  return 0;
};

const runBlock = (): number => {
  const id = firstArg;
  const target = id === undefined ? undefined : singleTarget(id);
  if (id === undefined || target === undefined) {
    console.error(`Unknown target: ${id ?? '(none)'}`);
    return 2;
  }
  updateEntry(id, (existing) => ({
    ...baseEntry(target, existing),
    status: 'blocked',
    approvedAt: null,
  }));
  return 0;
};

const COMMANDS = {
  scan: runScan,
  approve: runApprove,
  accept: runAccept,
  block: runBlock,
  setup: (): number => runSetup(flag('apply')),
};

const runCommand = Object.entries(COMMANDS).find(([name]) => name === command)?.[1];

process.exitCode =
  runCommand === undefined ? (console.error(`Unknown command: ${command}`), 2) : runCommand();
