import * as Schema from 'effect/Schema';

import { InstalledPlugins } from '../schemas/InstalledPlugins.js';

export const decodeInstalledPlugins = Schema.decodeUnknownEffect(
  Schema.fromJsonString(InstalledPlugins),
);
