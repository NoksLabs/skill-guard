import type { HookInput } from '../schemas/HookInput.ts';

export const failsClosed = (input: HookInput): boolean =>
  input.hook_event_name === 'UserPromptSubmit' ||
  (input.hook_event_name === 'PreToolUse' && input.tool_name === 'Skill');
