export const PROJECT_SKILL_ROOTS: ReadonlyArray<ReadonlyArray<string>> = [
  ['.agents', 'skills'],
  ['.claude', 'skills'],
  ['.pi', 'skills'],
];

export const USER_SKILL_ROOTS: ReadonlyArray<ReadonlyArray<string>> = [
  ['.claude', 'skills'],
  ['.agents', 'skills'],
  ['.pi', 'agent', 'skills'],
];

export const INSTALLED_PLUGINS_FILE: ReadonlyArray<string> = [
  '.claude',
  'plugins',
  'installed_plugins.json',
];
