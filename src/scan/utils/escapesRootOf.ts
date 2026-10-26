export const escapesRootOf = (linkTarget: string | undefined, root: string): string | undefined =>
  linkTarget === undefined || linkTarget.startsWith(`${root}/`) || linkTarget === root
    ? undefined
    : linkTarget;
