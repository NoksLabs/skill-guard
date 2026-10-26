                                                               
                                                                

const pathsOf = (...candidates                                   )                        =>
  candidates.filter((candidate) => candidate !== undefined);

export const openCodeToolCall = (tool        , args                  )                => {
  switch (tool) {
    case 'skill':
      return { kind: 'skill', name: args.name ?? args.id };
    case 'read':
      return { kind: 'read', paths: pathsOf(args.filePath ?? args.path) };
    case 'grep':
      return { kind: 'search', paths: pathsOf(args.path, args.include) };
    case 'edit':
      return { kind: 'edit', paths: pathsOf(args.filePath ?? args.path) };
    case 'bash':
    case 'shell':
      return args.command === undefined
        ? { kind: 'other' }
        : { kind: 'shell', command: args.command, workdir: args.workdir };
    default:
      return { kind: 'other' };
  }
};
