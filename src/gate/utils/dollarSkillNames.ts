export const dollarSkillNames = (prompt: string): ReadonlyArray<string> => [
  ...new Set(
    [...prompt.matchAll(/(?:^|\s)\$([\w.-]+(?::[\w.-]+)?)/g)].flatMap((match) =>
      match[1] === undefined ? [] : [match[1]],
    ),
  ),
];
