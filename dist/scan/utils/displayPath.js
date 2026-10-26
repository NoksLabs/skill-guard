                                         

export const displayPath = (
  path           ,
  home        ,
  projectDir        ,
  target        ,
)         =>
  target.startsWith(`${projectDir}/`)
    ? path.relative(projectDir, target)
    : target.startsWith(`${home}/`)
      ? `~/${path.relative(home, target)}`
      : target;
