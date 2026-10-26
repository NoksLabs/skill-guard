const SEPARATORS = /[\s'"`;|&<>()=,:@]+/;

const split = (command: string): ReadonlyArray<string> =>
  command.split(SEPARATORS).filter((token) => token.length > 0);

export const commandPathTokens = (command: string): ReadonlyArray<string> => [
  ...new Set([...split(command), ...split(command.replaceAll(/['"\\]/g, ''))]),
];
