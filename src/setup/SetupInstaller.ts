import * as Console from 'effect/Console';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Layer from 'effect/Layer';
import * as Path from 'effect/Path';

import { Environment } from '../shared/Environment.ts';
import { TrustRegistryStore } from '../trust/TrustRegistryStore.ts';
import {
  CLAUDE_DIR,
  CLAUDE_SETTINGS_FILE,
  PI_EXTENSION_FILE,
  PI_EXTENSIONS_DIR,
  SETTINGS_BACKUP_SUFFIX,
} from './constants/SetupPaths.ts';
import { decodeClaudeSettings } from './decoders/decodeClaudeSettings.ts';
import { encodeSettings } from './encoders/encodeSettings.ts';
import { withGuard } from './utils/withGuard.ts';

export class SetupInstaller extends Context.Service<SetupInstaller>()(
  'skill-guard/setup/SetupInstaller',
  {
    make: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const env = yield* Environment;
      const registry = yield* TrustRegistryStore;

      const packageDir = path.resolve(import.meta.dirname, '..');
      const piExtensionFile = path.join(env.home, ...PI_EXTENSION_FILE);
      const claudeSettingsFile = path.join(env.home, ...CLAUDE_SETTINGS_FILE);
      const gateCommand = `node "${path.join(packageDir, 'claudeGate.js')}"`;
      const piExtension = `export { default } from '${path.join(packageDir, 'piExtension.js')}';\n`;

      const run = Effect.fn('SetupInstaller.run')(function* (apply: boolean) {
        const settingsExist = yield* fs.exists(claudeSettingsFile);
        const settings = settingsExist
          ? yield* decodeClaudeSettings(yield* fs.readFileString(claudeSettingsFile))
          : {};
        const nextSettings = withGuard(settings, gateCommand);
        const settingsChanged = encodeSettings(nextSettings) !== encodeSettings(settings);

        yield* Console.log(
          `skill-guard user-level setup${apply ? '' : ' (dry run; pass --apply to write)'}`,
        );
        yield* Console.log(`  write ${piExtensionFile}`);
        yield* Console.log(
          settingsChanged
            ? `  add PreToolUse(Skill|Read) + UserPromptSubmit hooks to ${claudeSettingsFile} (backup: settings.json${SETTINGS_BACKUP_SUFFIX})`
            : `  ${claudeSettingsFile} already has the skill-guard hooks`,
        );
        yield* Console.log(
          `  user registry: ${registry.userPath} (approve with: skill-guard approve user:<name> --user)`,
        );

        if (!apply) {
          return;
        }
        yield* fs.makeDirectory(path.join(env.home, ...PI_EXTENSIONS_DIR), { recursive: true });
        yield* fs.writeFileString(piExtensionFile, piExtension);
        if (settingsChanged) {
          if (settingsExist) {
            yield* fs.copyFile(
              claudeSettingsFile,
              `${claudeSettingsFile}${SETTINGS_BACKUP_SUFFIX}`,
            );
          }
          yield* fs.makeDirectory(path.join(env.home, ...CLAUDE_DIR), { recursive: true });
          yield* fs.writeFileString(claudeSettingsFile, encodeSettings(nextSettings));
        }
        yield* Console.log('done. Start a new Claude Code / Pi session to load the guard.');
      });

      return { run };
    }),
  },
) {
  static readonly Layer = Layer.effect(this)(this.make).pipe(
    Layer.provide(Layer.mergeAll(Environment.Layer, TrustRegistryStore.Layer)),
  );
}
