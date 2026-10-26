import { defineRule } from '@oxlint/plugins';

import { isFeatureCode, repoRelativeFilename } from '../shared/scoping.ts';

const BANNED_HOOKS = new Set([
  'useState',
  'useReducer',
  'useSyncExternalStore',
  'useEffect',
  'useLayoutEffect',
  'useMemo',
  'useCallback',
]);

export const noReactHooksRule = defineRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow useState/useReducer/useSyncExternalStore/useEffect/useLayoutEffect/useMemo/useCallback in feature code. Derive state from backend data + router params using Effect atoms or services. Use Effect services for side effects. Let React Compiler handle memoization.',
    },
    messages: {
      bannedHook:
        'Do not use {{hook}}. Derive from backend + URL params with Effect atoms (see @effect/atom-react). Use Effect services for side effects. Let React Compiler handle memo.',
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (node.callee.type === 'Super' || node.callee.type === 'V8IntrinsicExpression') return;

        let hookName: string | null = null;
        const callee = node.callee;

        if (callee.type === 'Identifier') {
          hookName = callee.name;
        } else if (
          callee.type === 'MemberExpression' &&
          !callee.computed &&
          callee.property.type === 'Identifier'
        ) {
          hookName = callee.property.name;
        }

        if (
          hookName &&
          BANNED_HOOKS.has(hookName) &&
          isFeatureCode(repoRelativeFilename(context))
        ) {
          context.report({
            node,
            messageId: 'bannedHook',
            data: { hook: hookName },
          });
        }
      },
    };
  },
});
