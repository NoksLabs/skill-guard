export const PROJECT_FILE_ROOTS: ReadonlyArray<string> = [
  'AGENTS.md',
  'CLAUDE.md',
  '.claude/agents',
  '.claude/commands',
  '.claude/hooks',
  '.claude/settings.json',
  '.pi',
];

export const SKIPPED_DIRS: ReadonlySet<string> = new Set(['node_modules', 'skills', '.git']);

export const USER_FILE_ROOTS: ReadonlyArray<ReadonlyArray<string>> = [
  ['.claude', 'CLAUDE.md'],
  ['.claude', 'agents'],
  ['.claude', 'commands'],
  ['.pi', 'agent', 'AGENTS.md'],
  ['.pi', 'agent', 'prompts'],
  ['.pi', 'agent', 'extensions'],
];

export const SCANNED_PREFIXES: ReadonlyArray<string> = [
  '.agents/skills/',
  '.claude/skills/',
  '.pi/',
  ...PROJECT_FILE_ROOTS,
];
