import type { ESTree } from '@oxlint/plugins';

export function repoRelativeFilename(context: {
  readonly filename: string;
  readonly cwd: string;
}): string {
  const filename = context.filename.replace(/\\/g, '/');
  const cwd = context.cwd.replace(/\\/g, '/').replace(/\/$/, '');
  return filename.startsWith(`${cwd}/`) ? filename.slice(cwd.length) : filename;
}

const LOADER_NAMES = new Set(['loader', 'beforeLoad']);

function isLoaderBinding(node: ESTree.Node): boolean {
  const parent = node.parent;
  return (
    parent !== null &&
    parent !== undefined &&
    parent.type === 'VariableDeclarator' &&
    parent.init === node &&
    parent.id.type === 'Identifier' &&
    LOADER_NAMES.has(parent.id.name)
  );
}

export function isTestFile(filename: string | undefined): boolean {
  if (!filename) return false;
  const f = filename.replace(/\\/g, '/');
  return (
    /\.(test|spec)\.(ts|tsx|js|jsx|mts|cts)$/.test(f) ||
    /\/(test|tests|__tests__|e2e)\//.test(f) ||
    /\/\.pi\//.test(f)
  );
}

export function isFeatureCode(filename: string | undefined): boolean {
  if (!filename || isTestFile(filename)) return false;
  const f = filename.replace(/\\/g, '/');
  return (
    /\/(apps\/[^/]+\/src|src)\/(features|routes)\//.test(f) &&
    !/\/(lib|utils\/ui|config|infra|orchestrator|packages\/|tooling\/|node_modules)\//.test(f)
  );
}

export function isInRoutesLoaderContext(startNode: ESTree.Node): boolean {
  let current: ESTree.Node | undefined = startNode;
  while (current) {
    const nodeType = current.type;
    if (
      (nodeType === 'FunctionDeclaration' ||
        nodeType === 'FunctionExpression' ||
        nodeType === 'ArrowFunctionExpression') &&
      ((current.id?.type === 'Identifier' && LOADER_NAMES.has(current.id.name)) ||
        isLoaderBinding(current))
    ) {
      return true;
    }
    if (
      nodeType === 'Property' &&
      !current.computed &&
      ((current.key.type === 'Identifier' &&
        (current.key.name === 'loader' || current.key.name === 'beforeLoad')) ||
        (current.key.type === 'Literal' &&
          (current.key.value === 'loader' || current.key.value === 'beforeLoad')))
    ) {
      return true;
    }
    current = current.parent ?? undefined;
  }
  return false;
}
