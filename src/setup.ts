import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { userRegistryPath } from './trustRegistry.ts';

const packageDir = import.meta.dirname;
const piExtensionFile = join(homedir(), '.pi', 'agent', 'extensions', 'skill-guard.ts');
const claudeSettingsFile = join(homedir(), '.claude', 'settings.json');
const gateCommand = `node "${join(packageDir, 'claudeGate.js')}"`;

type HookCommand = { readonly type: string; readonly command: string; readonly timeout?: number };
type HookGroup = { readonly matcher?: string; readonly hooks: ReadonlyArray<HookCommand> };
type ClaudeSettings = {
  readonly hooks?: Readonly<Record<string, ReadonlyArray<HookGroup>>>;
};

const guardHooks: ReadonlyArray<HookCommand> = [
  { type: 'command', command: gateCommand, timeout: 10 },
];

const toolGuardGroup: HookGroup = { matcher: 'Skill|Read', hooks: guardHooks };

const promptGuardGroup: HookGroup = { hooks: guardHooks };

const hasGuard = (groups: ReadonlyArray<HookGroup> | undefined): boolean =>
  (groups ?? []).some((group) =>
    group.hooks.some((hook) => /skill-guard\/.*claudeGate\.js/.test(hook.command)),
  );

const withGuard = (settings: ClaudeSettings): ClaudeSettings => {
  const hooks = settings.hooks ?? {};
  const preToolUse = hooks['PreToolUse'] ?? [];
  const userPromptSubmit = hooks['UserPromptSubmit'] ?? [];
  return {
    ...settings,
    hooks: {
      ...hooks,
      PreToolUse: hasGuard(preToolUse) ? preToolUse : [...preToolUse, toolGuardGroup],
      UserPromptSubmit: hasGuard(userPromptSubmit)
        ? userPromptSubmit
        : [...userPromptSubmit, promptGuardGroup],
    },
  };
};

export const runSetup = (apply: boolean): number => {
  const currentSettings: ClaudeSettings | null = existsSync(claudeSettingsFile)
    ? JSON.parse(readFileSync(claudeSettingsFile, 'utf8'))
    : {};
  const settings: ClaudeSettings = currentSettings ?? {};
  const nextSettings = withGuard(settings);
  const settingsChanged = JSON.stringify(nextSettings) !== JSON.stringify(settings);
  const piExtension = `export { default } from '${join(packageDir, 'piExtension.js')}';\n`;

  console.log(`skill-guard user-level setup${apply ? '' : ' (dry run; pass --apply to write)'}`);
  console.log(`  write ${piExtensionFile}`);
  console.log(
    settingsChanged
      ? `  add PreToolUse(Skill|Read) + UserPromptSubmit hooks to ${claudeSettingsFile} (backup: settings.json.bak-skill-guard)`
      : `  ${claudeSettingsFile} already has the skill-guard hooks`,
  );
  console.log(
    `  user registry: ${userRegistryPath()} (approve with: skill-guard approve user:<name> --user)`,
  );

  if (apply) {
    mkdirSync(join(homedir(), '.pi', 'agent', 'extensions'), { recursive: true });
    writeFileSync(piExtensionFile, piExtension);
    if (settingsChanged) {
      if (existsSync(claudeSettingsFile)) {
        copyFileSync(claudeSettingsFile, `${claudeSettingsFile}.bak-skill-guard`);
      }
      mkdirSync(join(homedir(), '.claude'), { recursive: true });
      writeFileSync(claudeSettingsFile, `${JSON.stringify(nextSettings, null, 2)}\n`);
    }
    console.log('done. Start a new Claude Code / Pi session to load the guard.');
  }
  return 0;
};
