import * as Layer from 'effect/Layer';

import { ContentScanner } from '../scan/ContentScanner.ts';
import { ScanTargets } from '../scan/ScanTargets.ts';
import { SetupInstaller } from '../setup/SetupInstaller.ts';
import { Environment } from '../shared/Environment.ts';
import { SkillFiles } from '../skill/SkillFiles.ts';
import { TrustRegistryStore } from '../trust/TrustRegistryStore.ts';

export const CliLayer = Layer.mergeAll(
  Environment.Layer,
  SkillFiles.Layer,
  ContentScanner.Layer,
  ScanTargets.Layer,
  TrustRegistryStore.Layer,
  SetupInstaller.Layer,
);
