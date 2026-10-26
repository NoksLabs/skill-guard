                                                         

export const failsClosed = (input           )          =>
  input.hook_event_name === 'UserPromptSubmit' ||
  (input.hook_event_name === 'PreToolUse' && input.tool_name === 'Skill');
