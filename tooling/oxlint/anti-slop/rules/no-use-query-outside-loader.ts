import { defineRule } from '@oxlint/plugins';
import type { ESTree } from '@oxlint/plugins';

import { isInRoutesLoaderContext } from '../shared/scoping.ts';

function isUseQueryCall(node: ESTree.CallExpression): string | null {
  const callee = node.callee;
  if (callee.type === 'Identifier' && callee.name === 'useQuery') {
    return 'useQuery';
  }
  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'useQuery'
  ) {
    return 'useQuery';
  }
  return null;
}

export const noUseQueryOutsideLoaderRule = defineRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        "Ban useQuery (react-query) calls outside TanStack Router loader functions. Data loading for routes with preload must be declared in the route's loader (or beforeLoad) so it can be initiated during navigation. Use Effect atoms for client state instead.",
    },
    messages: {
      useQueryOutsideLoader:
        'useQuery must only be called in coordination with TanStack Router route loaders. Preload data in route loaders (e.g. via ensureQueryData) and use suspense queries or route loader data in components.',
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const hook = isUseQueryCall(node);
        if (!hook) return;
        if (isInRoutesLoaderContext(node)) return;

        context.report({
          node,
          messageId: 'useQueryOutsideLoader',
        });
      },
    };
  },
});
