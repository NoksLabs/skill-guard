import { defineRule } from '@oxlint/plugins';
import type { ESTree } from '@oxlint/plugins';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { isFeatureCode, repoRelativeFilename } from '../shared/scoping.ts';

const NATIVE_NODE_MODULES = new Set([
  'fs',
  'path',
  'http',
  'https',
  'crypto',
  'os',
  'child_process',
  'util',
  'stream',
  'net',
  'tls',
  'dns',
  'url',
  'buffer',
  'events',
  'assert',
  'readline',
  'zlib',
]);

const EFFECT_ALTERNATIVES = new Map([
  ['fs', 'FileSystem from "effect/FileSystem" or @effect/platform-node/NodeFileSystem'],
  ['path', 'Path from "effect/Path" or @effect/platform-node/NodePath'],
  ['http', 'HttpClient from "@effect/platform" or @effect/platform-node/NodeHttpClient'],
  ['https', 'HttpClient from "@effect/platform"'],
  ['crypto', 'use platform crypto (NodeCrypto) or Effect "Random"'],
  ['child_process', 'Command from "@effect/platform" or NodeChildProcessSpawner'],
  ['os', 'use platform equivalents or Config'],
]);

function getModuleName(src: string): string | null {
  const bare = src.replace(/^node:/, '').split('/')[0] ?? '';
  return NATIVE_NODE_MODULES.has(bare) ? src : null;
}

function getAlternative(mod: string): string {
  const key = mod.replace(/^node:/, '').split('/')[0] ?? '';
  return (
    EFFECT_ALTERNATIVES.get(key) ??
    'equivalent from "effect" or "@effect/platform" (e.g. Path, FileSystem, HttpClient)'
  );
}

export const noNativeNodeModulesRule = defineRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow importing Node.js built-in modules (fs/path/http etc or node:*) when Effect-TS provides alternatives. Import from "effect/Path", "effect/FileSystem", "@effect/platform/HttpClient", "@effect/platform-node/..." instead. See tooling for allowed infra usage.',
    },
    messages: {
      nativeNodeModule:
        'Native Node module "{{module}}" forbidden here. Use Effect alternative: {{alternative}}.',
    },
  },
  createOnce(context) {
    function checkSource(sourceNode: ESTree.StringLiteral) {
      if (!isFeatureCode(repoRelativeFilename(context))) return;
      const mod = getModuleName(sourceNode.value);
      if (!mod) return;
      context.report({
        node: sourceNode,
        messageId: 'nativeNodeModule',
        data: { module: mod, alternative: getAlternative(mod) },
      });
    }

    return {
      ImportDeclaration(node) {
        checkSource(node.source);
      },
      ExportAllDeclaration(node) {
        if (node.source) checkSource(node.source);
      },
      ExportNamedDeclaration(node) {
        if (node.source) checkSource(node.source);
      },
      CallExpression(node) {
        if (!isFeatureCode(repoRelativeFilename(context))) return;
        if (node.callee.type === 'Super' || node.callee.type === 'V8IntrinsicExpression') return;
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length > 0
        ) {
          const arg = node.arguments[0];
          if (arg.type !== 'Literal') return;
          const src = Option.getOrUndefined(Schema.decodeUnknownOption(Schema.String)(arg.value));
          if (src === undefined) return;
          const mod = getModuleName(src);
          if (mod) {
            context.report({
              node: arg,
              messageId: 'nativeNodeModule',
              data: { module: mod, alternative: getAlternative(mod) },
            });
          }
        }
      },
    };
  },
});
