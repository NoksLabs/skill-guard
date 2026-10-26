import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';

import { decodeHookEvents } from '../decoders/decodeHookEvents.ts';
import { decodeHookGroupObject } from '../decoders/decodeHookGroupObject.ts';
import { decodeHookGroups } from '../decoders/decodeHookGroups.ts';
import type { ClaudeSettings } from '../schemas/ClaudeSettings.ts';

const isGuardGroup = (group: Schema.Json): boolean =>
  Option.match(decodeHookGroups([group]), {
    onNone: () => false,
    onSome: (decoded) =>
      decoded.some((guard) =>
        guard.hooks.some((hook) => /skill-guard\/.*claudeGate\.js/.test(hook.command ?? '')),
      ),
  });

const withGuardMatcher =
  (toolMatcher: string) =>
  (group: Schema.Json): Schema.Json =>
    isGuardGroup(group)
      ? Option.match(decodeHookGroupObject(group), {
          onNone: () => group,
          onSome: (decoded) => ({ ...decoded, matcher: toolMatcher }),
        })
      : group;

export const withGuard = (settings: ClaudeSettings, gateCommand: string, toolMatcher: string) => {
  const guardHooks = [{ type: 'command', command: gateCommand, timeout: 10 }];
  const toolGuardGroup = { matcher: toolMatcher, hooks: guardHooks };
  const promptGuardGroup = { hooks: guardHooks };
  const hooks = decodeHookEvents(settings['hooks']);
  const preToolUse = hooks['PreToolUse'] ?? [];
  const userPromptSubmit = hooks['UserPromptSubmit'] ?? [];
  return {
    ...settings,
    hooks: {
      ...hooks,
      PreToolUse: preToolUse.some(isGuardGroup)
        ? preToolUse.map(withGuardMatcher(toolMatcher))
        : [...preToolUse, toolGuardGroup],
      UserPromptSubmit: userPromptSubmit.some(isGuardGroup)
        ? userPromptSubmit
        : [...userPromptSubmit, promptGuardGroup],
    },
  } satisfies ClaudeSettings;
};
