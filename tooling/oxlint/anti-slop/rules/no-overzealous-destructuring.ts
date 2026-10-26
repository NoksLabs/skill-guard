import { defineRule } from '@oxlint/plugins';
import type { ESTree } from '@oxlint/plugins';

import { isFeatureCode, repoRelativeFilename } from '../shared/scoping.ts';

function countDestructuredKeys(pattern: ESTree.ObjectPattern | ESTree.ArrayPattern): number {
  if (pattern.type === 'ObjectPattern') {
    return pattern.properties.length;
  }
  return pattern.elements.length;
}

function unwrapPattern(node: ESTree.Node | null): ESTree.Node | null {
  if (node === null) return null;
  if (node.type === 'AssignmentPattern') return unwrapPattern(node.left);
  if (node.type === 'RestElement') return unwrapPattern(node.argument);
  return node;
}

function hasDeepNesting(node: ESTree.Node | null, depth: number = 0): boolean {
  const pattern = unwrapPattern(node);
  if (pattern === null) return false;
  if (pattern.type !== 'ObjectPattern' && pattern.type !== 'ArrayPattern') return false;
  if (depth > 0) return true;
  if (pattern.type === 'ObjectPattern') {
    return pattern.properties.some((prop) =>
      hasDeepNesting(prop.type === 'Property' ? prop.value : prop.argument, depth + 1),
    );
  }
  return pattern.elements.some((element) => hasDeepNesting(element, depth + 1));
}

export const noOverzealousDestructuringRule = defineRule({
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow overzealous destructuring (more than 3 keys at one level, or nested destructuring) in feature code. Prefer explicit member access or small targeted destructures for readability and to keep mental model small.',
    },
    messages: {
      tooManyKeys:
        'Destructuring {{count}} keys at once is overzealous. Destructure at most 3, or access properties directly (e.g. obj.foo).',
      tooDeep:
        'Nested destructuring is overzealous. Destructure at most one level deep in feature code.',
    },
  },
  createOnce(context) {
    function checkPattern(node: ESTree.ObjectPattern | ESTree.ArrayPattern) {
      if (!isFeatureCode(repoRelativeFilename(context))) return;

      const count = countDestructuredKeys(node);
      if (count > 3) {
        context.report({
          node,
          messageId: 'tooManyKeys',
          data: { count: String(count) },
        });
        return;
      }

      if (hasDeepNesting(node)) {
        context.report({
          node,
          messageId: 'tooDeep',
        });
      }
    }

    return {
      ObjectPattern: checkPattern,
      ArrayPattern: checkPattern,
    };
  },
});
