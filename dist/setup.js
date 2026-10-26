import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Schema from 'effect/Schema';
                                                           
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

const decodeJson = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Unknown));

const isRecord = (value         )                                             =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const HookGroups = Schema.Array(
  Schema.Struct({ hooks: Schema.Array(Schema.Struct({ command: Schema.optionalKey(Schema.String) })) }),
);

const hasGuard = (groups                        )          =>
  Schema.decodeUnknownOption(HookGroups)(groups).pipe(
    (decoded) => decoded._tag === 'Some' && decoded.value.some((group) =>
      group.hooks.some((hook) => /skill-guard\/.*claudeGate\.js/.test(hook.command ?? '')),
    ),
  );

const groupsOf = (hooks                                   , event        )                         => {
  const groups = hooks[event];
  return Array.isArray(groups) ? groups : [];
};

const withGuard = (settings                                   )                                    => {
  const hooks = isRecord(settings['hooks']) ? settings['hooks'] : {};
  const preToolUse = groupsOf(hooks, 'PreToolUse');
  const userPromptSubmit = groupsOf(hooks, 'UserPromptSubmit');
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

export const runSetup = (
  apply         ,
)                                                                                               =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const settingsExist = yield* fs.exists(claudeSettingsFile);
    const parsed = settingsExist ? yield* decodeJson(yield* fs.readFileString(claudeSettingsFile)) : {};
    const settings = isRecord(parsed) ? parsed : {};
    const nextSettings = withGuard(settings);
    const settingsChanged = JSON.stringify(nextSettings) !== JSON.stringify(settings);
    const piExtension = `export { default } from '${join(packageDir, 'piExtension.js')}';\n`;

    yield* Console.log(`skill-guard user-level setup${apply ? '' : ' (dry run; pass --apply to write)'}`);
    yield* Console.log(`  write ${piExtensionFile}`);
    yield* Console.log(
      settingsChanged
        ? `  add PreToolUse(Skill|Read) + UserPromptSubmit hooks to ${claudeSettingsFile} (backup: settings.json.bak-skill-guard)`
        : `  ${claudeSettingsFile} already has the skill-guard hooks`,
    );
    yield* Console.log(
      `  user registry: ${userRegistryPath()} (approve with: skill-guard approve user:<name> --user)`,
    );

    if (!apply) {
      return;
    }
    yield* fs.makeDirectory(join(homedir(), '.pi', 'agent', 'extensions'), { recursive: true });
    yield* fs.writeFileString(piExtensionFile, piExtension);
    if (settingsChanged) {
      if (settingsExist) {
        yield* fs.copyFile(claudeSettingsFile, `${claudeSettingsFile}.bak-skill-guard`);
      }
      yield* fs.makeDirectory(join(homedir(), '.claude'), { recursive: true });
      yield* fs.writeFileString(claudeSettingsFile, `${JSON.stringify(nextSettings, null, 2)}\n`);
    }
    yield* Console.log('done. Start a new Claude Code / Pi session to load the guard.');
  });
