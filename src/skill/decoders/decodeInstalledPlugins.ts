import * as Schema from 'effect/Schema';

import { InstalledPlugins } from '../schemas/InstalledPlugins.ts';

export const decodeInstalledPlugins = Schema.decodeUnknownEffect(
  Schema.fromJsonString(InstalledPlugins),
);
