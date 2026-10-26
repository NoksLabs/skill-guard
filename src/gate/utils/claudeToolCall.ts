import type { HookInput } from '../schemas/HookInput.ts';
import type { AgentToolCall } from '../types/AgentToolCall.ts';

const pathsOf = (...candidates: ReadonlyArray<string | undefined>): ReadonlyArray<string> =>
  candidates.filter((candidate) => candidate !== undefined);

export const claudeToolCall = (input: HookInput): AgentToolCall => {
  const args = input.tool_input;
  switch (input.tool_name) {
    case 'Skill':
      return { kind: 'skill', name: args?.skill ?? args?.command ?? args?.name };
    case 'Read':
      return { kind: 'read', paths: pathsOf(args?.file_path) };
    case 'Grep':
      return { kind: 'search', paths: pathsOf(args?.path, args?.glob) };
    case 'Edit':
    case 'MultiEdit':
      return { kind: 'edit', paths: pathsOf(args?.file_path) };
    case 'Bash':
      return args?.command === undefined
        ? { kind: 'other' }
        : { kind: 'shell', command: args.command, workdir: args.workdir };
    default:
      return { kind: 'other' };
  }
};
