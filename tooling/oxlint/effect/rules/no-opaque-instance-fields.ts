import type { CreateRule, ESTree } from '@oxlint/plugins';

const SCHEMA_SOURCES = new Set(['effect', 'effect/Schema']);
const SCHEMA_NAMESPACE_SOURCES = new Set(['effect/Schema']);

const rule: CreateRule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow instance members in Schema.Opaque classes' },
  },
  create(context) {
    const schemaIdentifiers = new Set<string>();
    const opaqueIdentifiers = new Set<string>();

    function isSchemaOpaqueExtension(node: ESTree.Class): boolean {
      const sc = node.superClass;
      if (!sc || sc.type !== 'CallExpression') return false;
      const inner = sc.callee;
      if (!inner || inner.type !== 'CallExpression') return false;
      return isOpaqueCallee(inner.callee);
    }

    function isOpaqueCallee(node: ESTree.Expression | null | undefined): boolean {
      if (!node) return false;
      if (node.type === 'Identifier') return opaqueIdentifiers.has(node.name);
      if (node.type !== 'MemberExpression') return false;
      if (node.property?.type !== 'Identifier' || node.property.name !== 'Opaque') return false;
      return isSchemaObject(node.object);
    }

    function isSchemaObject(node: ESTree.Expression | null | undefined): boolean {
      if (!node) return false;
      if (node.type === 'Identifier') return schemaIdentifiers.has(node.name);
      return false;
    }

    function checkClass(node: ESTree.Class) {
      if (!isSchemaOpaqueExtension(node)) return;
      for (const element of node.body.body) {
        if (element.type === 'PropertyDefinition' && !element.static) {
          context.report({
            node: element,
            message: 'Classes extending Schema.Opaque must not have instance members',
          });
        } else if (element.type === 'MethodDefinition' && !element.static) {
          context.report({
            node: element,
            message: 'Classes extending Schema.Opaque must not have instance members',
          });
        }
      }
    }

    return {
      ImportDeclaration(node: ESTree.ImportDeclaration) {
        if (node.importKind === 'type') return;
        const source = node.source.value;
        if (!SCHEMA_SOURCES.has(source)) return;

        for (const specifier of node.specifiers) {
          if (specifier.type === 'ImportNamespaceSpecifier') {
            if (SCHEMA_NAMESPACE_SOURCES.has(source)) {
              schemaIdentifiers.add(specifier.local.name);
            }
          } else if (specifier.type === 'ImportSpecifier' && specifier.importKind !== 'type') {
            if (specifier.imported.type !== 'Identifier') continue;
            const importedName = specifier.imported.name;
            if (importedName === 'Schema') {
              schemaIdentifiers.add(specifier.local.name);
            } else if (importedName === 'Opaque') {
              opaqueIdentifiers.add(specifier.local.name);
            }
          }
        }
      },
      ClassDeclaration: checkClass,
      ClassExpression: checkClass,
    };
  },
};

export default rule;
