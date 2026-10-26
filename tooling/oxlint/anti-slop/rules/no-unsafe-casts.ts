import { defineRule } from '@oxlint/plugins';
import type { ESTree } from '@oxlint/plugins';

import { isTestFile, repoRelativeFilename } from '../shared/scoping.ts';

function isConstAssertion(node: ESTree.TSAsExpression | ESTree.TSTypeAssertion): boolean {
  const ann = node.typeAnnotation;
  return (
    ann.type === 'TSTypeReference' &&
    ann.typeName.type === 'Identifier' &&
    ann.typeName.name === 'const'
  );
}

export const noUnsafeCastsRule = defineRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow type casts (`as T`, `<T>`, `!`) except const assertions and in test files. Use Schema.decode, type guards, or keep precise types instead of assertions.',
    },
    messages: {
      unsafeCast:
        'Type cast {{kind}} is not allowed outside tests (except `as const`). Prefer narrowing with Schema, predicates, or Effect data types.',
    },
  },
  createOnce(context) {
    return {
      TSAsExpression(node) {
        if (isTestFile(repoRelativeFilename(context))) return;
        if (isConstAssertion(node)) return;
        context.report({
          node,
          messageId: 'unsafeCast',
          data: { kind: 'as' },
        });
      },
      TSTypeAssertion(node) {
        if (isTestFile(repoRelativeFilename(context))) return;
        if (isConstAssertion(node)) return;
        context.report({
          node,
          messageId: 'unsafeCast',
          data: { kind: 'angle-bracket' },
        });
      },
      TSNonNullExpression(node) {
        if (isTestFile(repoRelativeFilename(context))) return;
        context.report({
          node,
          messageId: 'unsafeCast',
          data: { kind: 'non-null !' },
        });
      },
    };
  },
});
