import * as Schema from 'effect/Schema';

export const PluginInstall = Schema.Struct({ installPath: Schema.optionalKey(Schema.String) });

export const InstalledPlugins = Schema.NullOr(
  Schema.Struct({
    plugins: Schema.optionalKey(Schema.Record(Schema.String, Schema.Array(PluginInstall))),
  }),
);
