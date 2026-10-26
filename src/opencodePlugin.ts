import { openCodeHooks } from './gate/OpenCodeHandlers.ts';
import type { OpenCodeHooks, OpenCodePluginInput } from './gate/types/OpenCodeApi.ts';

export const SkillGuardPlugin = async (input: OpenCodePluginInput): Promise<OpenCodeHooks> =>
  openCodeHooks(input);
