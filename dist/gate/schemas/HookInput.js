import * as Schema from 'effect/Schema';

export const ToolInput = Schema.Struct({
  skill: Schema.optionalKey(Schema.String),
  command: Schema.optionalKey(Schema.String),
  name: Schema.optionalKey(Schema.String),
  file_path: Schema.optionalKey(Schema.String),
  path: Schema.optionalKey(Schema.String),
  glob: Schema.optionalKey(Schema.String),
  workdir: Schema.optionalKey(Schema.String),
});

export const HookInput = Schema.Struct({
  hook_event_name: Schema.optionalKey(Schema.String),
  cwd: Schema.optionalKey(Schema.String),
  tool_name: Schema.optionalKey(Schema.String),
  tool_input: Schema.optionalKey(ToolInput),
  prompt: Schema.optionalKey(Schema.String),
});

                                              
