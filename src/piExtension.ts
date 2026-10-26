import { onPiInput, onPiToolCall } from './gate/PiHandlers.ts';
import type { PiApi } from './gate/types/PiApi.ts';

export default function skillsGuard(pi: PiApi): void {
  pi.on('input', onPiInput);
  pi.on('tool_call', onPiToolCall);
}
