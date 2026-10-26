import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { userRegistryPath } from './trustRegistry.js';

const packageDir = import.meta.dirname;
const piExtensionFile = join(homedir(), '.pi', 'agent', 'extensions', 'skill-guard.ts');
const claudeSettingsFile = join(homedir(), '.claude', 'settings.json');
const gateCommand = `node "${join(packageDir, 'claudeGate.js')}"`;

                                                                                                  
                                                                                           
                       
                                                                      
  

const guardHooks                             = [
  { type: 'command', command: gateCommand, timeout: 10 },
];

const toolGuardGroup            = { matcher: 'Skill|Read', hooks: guardHooks };

const promptGuardGroup            = { hooks: guardHooks };

const hasGuard = (groups                                      )          =>
  (groups ?? []).some((group) =>
    group.hooks.some((hook) => /skill-guard\/.*claudeGate\.js/.test(hook.command)),
  );

const withGuard = (settings                )                 => {
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

export const runSetup = (apply         )         => {
  const currentSettings                        = existsSync(claudeSettingsFile)
    ? JSON.parse(readFileSync(claudeSettingsFile, 'utf8'))
    : {};
  const settings                 = currentSettings ?? {};
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
