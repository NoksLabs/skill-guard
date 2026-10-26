export const expandHome = (candidate: string, home: string): string =>
  candidate.replace(/^(~|\$HOME|\$\{HOME\})(?=\/|$)/, home);
