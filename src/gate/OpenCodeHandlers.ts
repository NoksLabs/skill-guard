import { toolCallDenialReason } from './HandlerRuntime.ts';
import type {
  OpenCodeHooks,
  OpenCodePluginInput,
  OpenCodeToolInput,
  OpenCodeToolOutput,
} from './types/OpenCodeApi.ts';
import { openCodeToolCall } from './utils/openCodeToolCall.ts';

export const openCodeHooks = (plugin: OpenCodePluginInput): OpenCodeHooks => ({
  'tool.execute.before': async (input: OpenCodeToolInput, output: OpenCodeToolOutput) => {
    const reason = await toolCallDenialReason(
      openCodeToolCall(input.tool, output.args),
      plugin.directory,
    );
    if (reason !== undefined) {
      throw new Error(reason);
    }
  },
});
