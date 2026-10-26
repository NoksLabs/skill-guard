import { defineRule } from '@oxlint/plugins';

const BANNED_LIFECYCLE_HOOKS = new Set(['beforeEach', 'afterEach', 'beforeAll', 'afterAll']);

export const noTestLifecycleHooksRule = defineRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow beforeEach/afterEach/beforeAll/afterAll test lifecycle hooks. Use explicit resource management (Effect.acquireRelease, Layer.scoped, it.layer, it.scoped) or explicit test fixtures instead.',
    },
    messages: {
      bannedLifecycleHook:
        'Test lifecycle hook "{{hook}}" is banned. Use explicit resource management (Effect.acquireRelease, Layer.scoped, it.layer) or explicit test fixtures. This eliminates mutable "let" state and enables safe test execution with vitest isolate: false.',
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (node.callee.type === 'Super' || node.callee.type === 'V8IntrinsicExpression') return;

        let hookName: string | null = null;
        if (node.callee.type === 'Identifier') {
          hookName = node.callee.name;
        } else if (
          node.callee.type === 'MemberExpression' &&
          !node.callee.computed &&
          node.callee.property.type === 'Identifier'
        ) {
          hookName = node.callee.property.name;
        }

        if (hookName && BANNED_LIFECYCLE_HOOKS.has(hookName)) {
          context.report({
            node,
            messageId: 'bannedLifecycleHook',
            data: { hook: hookName },
          });
        }
      },
    };
  },
});
