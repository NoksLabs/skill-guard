import * as Schema from 'effect/Schema';

export const LockedSkill = Schema.Struct({ source: Schema.optionalKey(Schema.String) });

export const SkillsLock = Schema.NullOr(
  Schema.Struct({ skills: Schema.optionalKey(Schema.Record(Schema.String, LockedSkill)) }),
);
