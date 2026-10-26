import type { TrustDecision } from '../../trust/types/TrustDecision.ts';
import type { HookInput } from '../schemas/HookInput.ts';

export const encodeHookOutput = (input: HookInput, decision: TrustDecision): string | undefined =>
  decision.allowed
    ? undefined
    : JSON.stringify(
        input.hook_event_name === 'UserPromptSubmit'
          ? { decision: 'block', reason: `skill-guard: ${decision.reason}` }
          : {
              hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: `skill-guard: ${decision.reason}`,
              },
            },
      );
