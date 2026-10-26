export const PI_EXTENSIONS_DIR: ReadonlyArray<string> = ['.pi', 'agent', 'extensions'];

export const PI_EXTENSION_FILE: ReadonlyArray<string> = [...PI_EXTENSIONS_DIR, 'skill-guard.ts'];

export const CLAUDE_DIR: ReadonlyArray<string> = ['.claude'];

export const CLAUDE_SETTINGS_FILE: ReadonlyArray<string> = [...CLAUDE_DIR, 'settings.json'];

export const SETTINGS_BACKUP_SUFFIX = '.bak-skill-guard';

export const CODEX_HOOKS_FILE: ReadonlyArray<string> = ['.codex', 'hooks.json'];

export const OPENCODE_PLUGINS_DIR: ReadonlyArray<string> = ['.config', 'opencode', 'plugins'];

export const OPENCODE_PLUGIN_FILE: ReadonlyArray<string> = [
  ...OPENCODE_PLUGINS_DIR,
  'skill-guard.ts',
];

export const GUARD_TOOL_MATCHER = 'Skill|Read|Edit|MultiEdit|Grep|Bash';

export const CODEX_TOOL_MATCHER = 'Bash';
