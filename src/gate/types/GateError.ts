import type * as PlatformError from 'effect/PlatformError';
import type * as Schema from 'effect/Schema';

export type GateError = PlatformError.PlatformError | Schema.SchemaError;
