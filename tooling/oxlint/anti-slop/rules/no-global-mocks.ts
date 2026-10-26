import { defineRule } from '@oxlint/plugins';

const BANNED_GLOBAL_MOCK_METHODS = new Set([
  'spyOn',
  'stubGlobal',
  'stubEnv',
  'unstubAllGlobals',
  'unstubAllEnvs',
]);

export const noGlobalMocksRule = defineRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow vi.spyOn, vi.stubGlobal, vi.stubEnv, and global test mutations. Pass dependencies via Context.Service / Layer or function parameter DI.',
    },
    messages: {
      bannedGlobalMock:
        'Global mock/spy "{{method}}" is banned. Pass dependencies explicitly via Context.Service / Layer or function parameter DI to guarantee test isolation and enable isolate: false.',
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (node.callee.type === 'Super' || node.callee.type === 'V8IntrinsicExpression') return;

        if (
          node.callee.type === 'MemberExpression' &&
          !node.callee.computed &&
          node.callee.property.type === 'Identifier'
        ) {
          const obj = node.callee.object;
          const method = node.callee.property.name;
          if (
            obj.type === 'Identifier' &&
            (obj.name === 'vi' || obj.name === 'jest') &&
            BANNED_GLOBAL_MOCK_METHODS.has(method)
          ) {
            context.report({
              node,
              messageId: 'bannedGlobalMock',
              data: { method: `vi.${method}` },
            });
          }
        }
      },
    };
  },
});
