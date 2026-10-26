export const PROJECT_FILE_ROOTS                        = [
  'AGENTS.md',
  'CLAUDE.md',
  '.claude/agents',
  '.claude/commands',
  '.claude/hooks',
  '.claude/settings.json',
  '.pi',
];

export const SKIPPED_DIRS                      = new Set(['node_modules', 'skills', '.git']);

export const USER_FILE_ROOTS                                       = [
  ['.claude', 'CLAUDE.md'],
  ['.claude', 'agents'],
  ['.claude', 'commands'],
  ['.pi', 'agent', 'AGENTS.md'],
  ['.pi', 'agent', 'prompts'],
  ['.pi', 'agent', 'extensions'],
];

export const SCANNED_PREFIXES                        = [
  '.agents/skills/',
  '.claude/skills/',
  '.pi/',
  ...PROJECT_FILE_ROOTS,
];
