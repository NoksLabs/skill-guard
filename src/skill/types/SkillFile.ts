export type SkillFile = {
  readonly relativePath: string;
  readonly absolutePath: string;
  readonly isSymlink: boolean;
  readonly linkTarget: string | undefined;
};
