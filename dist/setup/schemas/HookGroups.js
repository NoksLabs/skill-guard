import * as Schema from 'effect/Schema';

export const HookCommand = Schema.Struct({ command: Schema.optionalKey(Schema.String) });

export const HookGroups = Schema.Array(Schema.Struct({ hooks: Schema.Array(HookCommand) }));
