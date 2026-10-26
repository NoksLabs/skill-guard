                                                               
                                                         

const pathsOf = (...candidates                                   )                        =>
  candidates.filter((candidate) => candidate !== undefined);

export const piToolCall = (event                 )                => {
  const args = event.input;
  switch (event.toolName) {
    case 'read':
      return { kind: 'read', paths: pathsOf(args.path) };
    case 'grep':
      return { kind: 'search', paths: pathsOf(args.path, args.glob) };
    case 'edit':
      return { kind: 'edit', paths: pathsOf(args.path) };
    case 'bash':
      return args.command === undefined
        ? { kind: 'other' }
        : { kind: 'shell', command: args.command, workdir: undefined };
    default:
      return { kind: 'other' };
  }
};
