import type * as Path from 'effect/Path';

export const displayPath = (
  path: Path.Path,
  home: string,
  projectDir: string,
  target: string,
): string =>
  target.startsWith(`${projectDir}/`)
    ? path.relative(projectDir, target)
    : target.startsWith(`${home}/`)
      ? `~/${path.relative(home, target)}`
      : target;
