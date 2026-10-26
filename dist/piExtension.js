import { onPiInput, onPiToolCall } from './gate/PiHandlers.js';
                                                   

export default function skillsGuard(pi       )       {
  pi.on('input', onPiInput);
  pi.on('tool_call', onPiToolCall);
}
