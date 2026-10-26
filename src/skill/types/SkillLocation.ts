import type { SkillScope } from './SkillScope.ts';

export type SkillLocation = {
  readonly id: string;
  readonly name: string;
  readonly scope: SkillScope;
  readonly dir: string;
  readonly realDir: string;
};
