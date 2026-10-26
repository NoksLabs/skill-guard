import * as Schema from 'effect/Schema';

export const ClaudeSettings = Schema.Record(Schema.String, Schema.Json);

export type ClaudeSettings = typeof ClaudeSettings.Type;

export const HookEvents = Schema.Record(Schema.String, Schema.Array(Schema.Json));

export type HookEvents = typeof HookEvents.Type;
