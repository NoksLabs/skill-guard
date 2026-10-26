import { eslintCompatPlugin } from '@oxlint/plugins';

import { noChainedTypeAssertionsRule } from './rules/no-chained-type-assertions.ts';
import { noConditionalEmptyObjectSpreadRule } from './rules/no-conditional-empty-object-spread.ts';
import { noCoverageSkipsRule } from './rules/no-coverage-skips.ts';
import { noGlobalMocksRule } from './rules/no-global-mocks.ts';
import { noKnownValueWideningRule } from './rules/no-known-value-widening.ts';
import { noModuleMockingRule } from './rules/no-module-mocking.ts';
import { noNativeNodeModulesRule } from './rules/no-native-node-modules.ts';
import { noObjectParametersRule } from './rules/no-object-parameters.ts';
import { noOverzealousDestructuringRule } from './rules/no-overzealous-destructuring.ts';
import { noReactHooksRule } from './rules/no-react-hooks.ts';
import { noReflectApplyRule } from './rules/no-reflect-apply.ts';
import { noReflectGetRule } from './rules/no-reflect-get.ts';
import { noRuntimeTypeofRule } from './rules/no-runtime-typeof.ts';
import { noForbiddenTermInSymbolNamesRule } from './rules/no-shape-in-symbol-names.ts';
import { noTestLifecycleHooksRule } from './rules/no-test-lifecycle-hooks.ts';
import { noUnknownParametersRule } from './rules/no-unknown-parameters.ts';
import { noUnknownReturnsRule } from './rules/no-unknown-returns.ts';
import { noUnknownTypeAliasesRule } from './rules/no-unknown-type-aliases.ts';
import { noUnsafeCastsRule } from './rules/no-unsafe-casts.ts';
import { noUnsafeDictionaryTypeRule } from './rules/no-unsafe-dictionary-type.ts';
import { noUseQueryOutsideLoaderRule } from './rules/no-use-query-outside-loader.ts';
import { noWidenThenAssertRule } from './rules/no-widen-then-assert.ts';
import { requireSafetyCommentForTypeAssertionRule } from './rules/require-safety-comment-for-type-assertion.ts';

const antiSlopPlugin = eslintCompatPlugin({
  meta: { name: 'anti-slop' },
  rules: {
    'no-chained-type-assertions': noChainedTypeAssertionsRule,
    'no-conditional-empty-object-spread': noConditionalEmptyObjectSpreadRule,
    'no-coverage-skips': noCoverageSkipsRule,
    'no-global-mocks': noGlobalMocksRule,
    'no-known-value-widening': noKnownValueWideningRule,
    'no-module-mocking': noModuleMockingRule,
    'no-native-node-modules': noNativeNodeModulesRule,
    'no-object-parameters': noObjectParametersRule,
    'no-overzealous-destructuring': noOverzealousDestructuringRule,
    'no-react-hooks': noReactHooksRule,
    'no-reflect-apply': noReflectApplyRule,
    'no-reflect-get': noReflectGetRule,
    'no-runtime-typeof': noRuntimeTypeofRule,
    'no-shape-in-symbol-names': noForbiddenTermInSymbolNamesRule,
    'no-test-lifecycle-hooks': noTestLifecycleHooksRule,
    'no-unknown-parameters': noUnknownParametersRule,
    'no-unknown-returns': noUnknownReturnsRule,
    'no-unknown-type-aliases': noUnknownTypeAliasesRule,
    'no-unsafe-casts': noUnsafeCastsRule,
    'no-unsafe-dictionary-type': noUnsafeDictionaryTypeRule,
    'no-use-query-outside-loader': noUseQueryOutsideLoaderRule,
    'no-widen-then-assert': noWidenThenAssertRule,
    'require-safety-comment-for-type-assertion': requireSafetyCommentForTypeAssertionRule,
  },
});

export default antiSlopPlugin;
