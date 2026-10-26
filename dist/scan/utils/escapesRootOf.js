export const escapesRootOf = (linkTarget                    , root        )                     =>
  linkTarget === undefined || linkTarget.startsWith(`${root}/`) || linkTarget === root
    ? undefined
    : linkTarget;
