import { defineRule } from '@oxlint/plugins';
import type { ESTree } from '@oxlint/plugins';

const SKIP_METHODS = new Set(['skip', 'only', 'todo']);

function isTestSkipCall(node: ESTree.CallExpression): boolean {
  const callee = node.callee;
  if (callee.type !== 'MemberExpression' || callee.computed) return false;
  if (callee.property.type !== 'Identifier') return false;
  const method = callee.property.name;
  if (!SKIP_METHODS.has(method)) return false;

  const obj = callee.object;
  if (obj.type === 'Identifier') {
    const name = obj.name;
    return name === 'it' || name === 'test' || name === 'describe' || name === 'suite';
  }
  return false;
}

export const noCoverageSkipsRule = defineRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow test skips (it.skip, describe.only, test.todo) and istanbul ignore comments. Every change should increase or maintain coverage; hiding code from coverage defeats the policy.',
    },
    messages: {
      testSkip: 'Test skip/only/todo hides coverage. Remove skip to ensure PRs increase coverage.',
      istanbulIgnore:
        'Istanbul/nyc/c8 ignore hides untested code. Remove to follow "every PR increases codecov" policy.',
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (isTestSkipCall(node)) {
          context.report({ node, messageId: 'testSkip' });
        }
      },
      Program() {
        const comments = context.sourceCode.getAllComments();
        for (const c of comments) {
          if (/istanbul\s+ignore|nyc\s+ignore|coverage\s+ignore|c8\s+ignore/i.test(c.value)) {
            context.report({
              node: { range: c.range },
              messageId: 'istanbulIgnore',
            });
          }
        }
      },
    };
  },
});
