import * as Option from 'effect/Option';
                                             

import { decodeHookEvents } from '../decoders/decodeHookEvents.js';
import { decodeHookGroups } from '../decoders/decodeHookGroups.js';
                                                                   

const hasGuard = (groups                            )          =>
  Option.match(decodeHookGroups(groups), {
    onNone: () => false,
    onSome: (decoded) =>
      decoded.some((group) =>
        group.hooks.some((hook) => /skill-guard\/.*claudeGate\.js/.test(hook.command ?? '')),
      ),
  });

export const withGuard = (settings                , gateCommand        ) => {
  const guardHooks = [{ type: 'command', command: gateCommand, timeout: 10 }];
  const toolGuardGroup = { matcher: 'Skill|Read', hooks: guardHooks };
  const promptGuardGroup = { hooks: guardHooks };
  const hooks = decodeHookEvents(settings['hooks']);
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
  }                         ;
};
