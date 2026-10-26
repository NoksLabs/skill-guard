const SEPARATORS = /[\s'"`;|&<>()=,:@]+/;

const split = (command        )                        =>
  command.split(SEPARATORS).filter((token) => token.length > 0);

export const commandPathTokens = (command        )                        => [
  ...new Set([...split(command), ...split(command.replaceAll(/['"\\]/g, ''))]),
];
