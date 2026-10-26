import * as Console from 'effect/Console';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Layer from 'effect/Layer';
import * as Path from 'effect/Path';

import { Environment } from '../shared/Environment.js';
import { TrustRegistryStore } from '../trust/TrustRegistryStore.js';
import {
  CLAUDE_SETTINGS_FILE,
  CODEX_HOOKS_FILE,
  CODEX_TOOL_MATCHER,
  GUARD_TOOL_MATCHER,
  OPENCODE_PLUGIN_FILE,
  PI_EXTENSION_FILE,
  SETTINGS_BACKUP_SUFFIX,
} from './constants/SetupPaths.js';
import { decodeClaudeSettings } from './decoders/decodeClaudeSettings.js';
import { encodeSettings } from './encoders/encodeSettings.js';
import { withGuard } from './utils/withGuard.js';

export class SetupInstaller extends Context.Service                ()(
  'skill-guard/setup/SetupInstaller',
  {
    make: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const env = yield* Environment;
      const registry = yield* TrustRegistryStore;

      const packageDir = path.resolve(import.meta.dirname, '..');
      const gateCommand = `node "${path.join(packageDir, 'claudeGate.js')}"`;
      const moduleFiles = [
        {
          file: path.join(env.home, ...PI_EXTENSION_FILE),
          content: `export { default } from '${path.join(packageDir, 'piExtension.js')}';\n`,
        },
        {
          file: path.join(env.home, ...OPENCODE_PLUGIN_FILE),
          content: `export { SkillGuardPlugin } from '${path.join(packageDir, 'opencodePlugin.js')}';\n`,
        },
      ];

      const planHooks = Effect.fn('SetupInstaller.planHooks')(function* (
        file        ,
        toolMatcher        ,
      ) {
        const exists = yield* fs.exists(file);
        const current = exists ? yield* decodeClaudeSettings(yield* fs.readFileString(file)) : {};
        const next = encodeSettings(withGuard(current, gateCommand, toolMatcher));
        return { file, toolMatcher, exists, next, changed: next !== encodeSettings(current) };
      });

      const run = Effect.fn('SetupInstaller.run')(function* (apply         ) {
        const hookPlans = [
          yield* planHooks(path.join(env.home, ...CLAUDE_SETTINGS_FILE), GUARD_TOOL_MATCHER),
          yield* planHooks(path.join(env.home, ...CODEX_HOOKS_FILE), CODEX_TOOL_MATCHER),
        ];

        yield* Console.log(
          `skill-guard user-level setup${apply ? '' : ' (dry run; pass --apply to write)'}`,
        );
        yield* Effect.forEach(moduleFiles, ({ file }) => Console.log(`  write ${file}`));
        yield* Effect.forEach(hookPlans, (plan) =>
          Console.log(
            plan.changed
              ? `  add PreToolUse(${plan.toolMatcher}) + UserPromptSubmit hooks to ${plan.file} (backup: ${path.basename(plan.file)}${SETTINGS_BACKUP_SUFFIX})`
              : `  ${plan.file} already has the skill-guard hooks`,
          ),
        );
        yield* Console.log(
          `  user registry: ${registry.userPath} (approve with: skill-guard approve user:<name> --user)`,
        );

        if (!apply) {
          return;
        }
        yield* Effect.forEach(moduleFiles, ({ file, content }) =>
          fs
            .makeDirectory(path.dirname(file), { recursive: true })
            .pipe(Effect.andThen(fs.writeFileString(file, content))),
        );
        yield* Effect.forEach(
          hookPlans.filter((plan) => plan.changed),
          (plan) =>
            Effect.gen(function* () {
              if (plan.exists) {
                yield* fs.copyFile(plan.file, `${plan.file}${SETTINGS_BACKUP_SUFFIX}`);
              }
              yield* fs.makeDirectory(path.dirname(plan.file), { recursive: true });
              yield* fs.writeFileString(plan.file, plan.next);
            }),
        );
        yield* Console.log(
          'done. Start a new Claude Code, Codex, OpenCode or Pi session to load the guard. In Codex, trust the hook with /hooks first.',
        );
      });

      return { run };
    }),
  },
) {
  static          Layer = Layer.effect(this)(this.make).pipe(
    Layer.provide(Layer.mergeAll(Environment.Layer, TrustRegistryStore.Layer)),
  );
}
