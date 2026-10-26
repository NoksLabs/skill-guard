import * as Layer from 'effect/Layer';

import { ContentScanner } from '../scan/ContentScanner.js';
import { ScanTargets } from '../scan/ScanTargets.js';
import { SetupInstaller } from '../setup/SetupInstaller.js';
import { Environment } from '../shared/Environment.js';
import { SkillFiles } from '../skill/SkillFiles.js';
import { TrustRegistryStore } from '../trust/TrustRegistryStore.js';

export const CliLayer = Layer.mergeAll(
  Environment.Layer,
  SkillFiles.Layer,
  ContentScanner.Layer,
  ScanTargets.Layer,
  TrustRegistryStore.Layer,
  SetupInstaller.Layer,
);
