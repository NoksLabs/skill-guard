export const expandHome = (candidate        , home        )         =>
  candidate.replace(/^(~|\$HOME|\$\{HOME\})(?=\/|$)/, home);
