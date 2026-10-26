                                                     
import { EXECUTION_RULES } from './rules/ExecutionRules.js';
import { EXFILTRATION_RULES } from './rules/ExfiltrationRules.js';
import { INJECTION_RULES } from './rules/InjectionRules.js';
import { SUPPLY_CHAIN_RULES } from './rules/SupplyChainRules.js';
import { SYSTEM_RULES } from './rules/SystemRules.js';

export const TEXT_RULES                          = [
  ...INJECTION_RULES,
  ...EXECUTION_RULES,
  ...EXFILTRATION_RULES,
  ...SYSTEM_RULES,
  ...SUPPLY_CHAIN_RULES,
];
