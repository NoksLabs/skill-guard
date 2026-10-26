import type { TextRule } from '../types/TextRule.ts';
import { EXECUTION_RULES } from './rules/ExecutionRules.ts';
import { EXFILTRATION_RULES } from './rules/ExfiltrationRules.ts';
import { INJECTION_RULES } from './rules/InjectionRules.ts';
import { SUPPLY_CHAIN_RULES } from './rules/SupplyChainRules.ts';
import { SYSTEM_RULES } from './rules/SystemRules.ts';

export const TEXT_RULES: ReadonlyArray<TextRule> = [
  ...INJECTION_RULES,
  ...EXECUTION_RULES,
  ...EXFILTRATION_RULES,
  ...SYSTEM_RULES,
  ...SUPPLY_CHAIN_RULES,
];
