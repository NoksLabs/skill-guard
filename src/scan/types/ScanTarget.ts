import type { SkillLocation } from '../../skill/types/SkillLocation.ts';
import type { TargetFile } from './TargetFile.ts';

export type TargetScope = 'project' | 'user' | 'plugin' | 'file';

export type ScanTarget = {
  readonly id: string;
  readonly scope: TargetScope;
  readonly path: string;
  readonly files: ReadonlyArray<TargetFile>;
  readonly skill: SkillLocation | undefined;
};
