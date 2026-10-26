import * as Schema from 'effect/Schema';

export const ClaudeSettings = Schema.Record(Schema.String, Schema.Json);

                                                        

export const HookEvents = Schema.Record(Schema.String, Schema.Array(Schema.Json));

                                                
