import { promptDenialReason, toolCallDenialReason } from './HandlerRuntime.ts';
import type {
  PiContext,
  PiInputEvent,
  PiInputResult,
  PiToolCallEvent,
  PiToolCallResult,
} from './types/PiApi.ts';
import { piToolCall } from './utils/piToolCall.ts';

export const onPiInput = async (event: PiInputEvent, ctx: PiContext): Promise<PiInputResult> => {
  const reason = await promptDenialReason(event.text, '/skill:', ctx.cwd);
  if (reason === undefined) {
    return { action: 'continue' };
  }
  ctx.ui.notify(reason, 'error');
  return { action: 'handled' };
};

export const onPiToolCall = async (
  event: PiToolCallEvent,
  ctx: PiContext,
): Promise<PiToolCallResult> => {
  const reason = await toolCallDenialReason(piToolCall(event), ctx.cwd);
  return reason === undefined ? undefined : { block: true, reason };
};
