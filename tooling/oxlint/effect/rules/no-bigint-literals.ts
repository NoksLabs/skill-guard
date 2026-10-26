import type { CreateRule } from '@oxlint/plugins';

const rule: CreateRule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow bigint literals' },
    fixable: 'code',
  },
  create(context) {
    return {
      Literal(node) {
        if ('bigint' in node) {
          const fixedSource = `BigInt(${node.value})`;
          context.report({
            node,
            message: 'BigInt literals are not allowed',
            fix: (fixer) => fixer.replaceText(node, fixedSource),
          });
        }
      },
    };
  },
};

export default rule;
