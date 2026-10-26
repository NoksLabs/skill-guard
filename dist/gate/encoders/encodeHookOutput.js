                                                                        
                                                         

export const encodeHookOutput = (input           , decision               )                     =>
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
