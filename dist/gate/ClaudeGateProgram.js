import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Stdio from 'effect/Stdio';
import * as Stream from 'effect/Stream';

import { Environment } from '../shared/Environment.js';
import { describeCause } from '../shared/utils/describeCause.js';
                                                                     
import { decodeHookInput } from './decoders/decodeHookInput.js';
import { encodeHookOutput } from './encoders/encodeHookOutput.js';
import { GateFailure } from './errors/GateFailure.js';
                                                        
import { ToolCallGate } from './ToolCallGate.js';
import { claudeToolCall } from './utils/claudeToolCall.js';
import { failsClosed } from './utils/failsClosed.js';

const ALLOWED                = { allowed: true };

const readInput = Stdio.Stdio.use(({ stdin }) =>
  stdin.pipe(Stream.decodeText(), Stream.mkString, Effect.flatMap(decodeHookInput)),
);

const decide = Effect.fn('ClaudeGate.decide')(function* (
  input           ,
  cwd        ,
  projectDir        ,
) {
  const gate = yield* ToolCallGate;
  if (input.hook_event_name === 'UserPromptSubmit') {
    return yield* gate.checkPrompt(projectDir, input.prompt ?? '', '/');
  }
  return input.hook_event_name === 'PreToolUse'
    ? yield* gate.checkCall(projectDir, cwd, claudeToolCall(input))
    : ALLOWED;
});

export const claudeGateProgram = Effect.gen(function* () {
  const input = yield* readInput.pipe(
    Effect.catchCause((cause) =>
      Console.error(`skill-guard: ${describeCause(cause)}`).pipe(Effect.andThen(new GateFailure())),
    ),
  );
  const env = yield* Environment;
  const gate = yield* ToolCallGate;
  const cwd = input.cwd ?? env.cwd;
  const decision = yield* Effect.gen(function* () {
    const projectDir = Option.isSome(env.claudeProjectDir)
      ? env.claudeProjectDir.value
      : yield* gate.projectRootOf(cwd);
    return yield* decide(input, cwd, projectDir);
  }).pipe(
    Effect.catchCause((cause) =>
      Console.error(`skill-guard: ${describeCause(cause)}`).pipe(
        Effect.andThen(failsClosed(input) ? new GateFailure() : Effect.succeed(ALLOWED)),
      ),
    ),
  );
  const line = encodeHookOutput(input, decision);
  if (line !== undefined) {
    yield* Console.log(line);
  }
});
