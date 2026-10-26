import * as Option from 'effect/Option';
                                             

import { decodeHookEvents } from '../decoders/decodeHookEvents.js';
import { decodeHookGroupObject } from '../decoders/decodeHookGroupObject.js';
import { decodeHookGroups } from '../decoders/decodeHookGroups.js';
                                                                   

const isGuardGroup = (group             )          =>
  Option.match(decodeHookGroups([group]), {
    onNone: () => false,
    onSome: (decoded) =>
      decoded.some((guard) =>
        guard.hooks.some((hook) => /skill-guard\/.*claudeGate\.js/.test(hook.command ?? '')),
      ),
  });

const withGuardMatcher =
  (toolMatcher        ) =>
  (group             )              =>
    isGuardGroup(group)
      ? Option.match(decodeHookGroupObject(group), {
          onNone: () => group,
          onSome: (decoded) => ({ ...decoded, matcher: toolMatcher }),
        })
      : group;

export const withGuard = (settings                , gateCommand        , toolMatcher        ) => {
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
  }                         ;
};
