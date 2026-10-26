export const slashSkillName = (prompt: string, prefix: string): string | undefined => {
  const trimmed = prompt.trimStart();
  if (!trimmed.startsWith(prefix)) {
    return undefined;
  }
  const name = trimmed.slice(prefix.length).split(/\s/, 1)[0] ?? '';
  return /^[\w.-]+(:[\w.-]+)?$/.test(name) ? name : undefined;
};
