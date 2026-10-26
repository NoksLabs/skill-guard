import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Stdio from 'effect/Stdio';
import * as Stream from 'effect/Stream';

import { Environment } from '../shared/Environment.ts';
import { describeCause } from '../shared/utils/describeCause.ts';
import type { TrustDecision } from '../trust/types/TrustDecision.ts';
import { decodeHookInput } from './decoders/decodeHookInput.ts';
import { encodeHookOutput } from './encoders/encodeHookOutput.ts';
import { GateFailure } from './errors/GateFailure.ts';
import type { HookInput } from './schemas/HookInput.ts';
import { SkillGate } from './SkillGate.ts';
import { failsClosed } from './utils/failsClosed.ts';
import { slashSkillName } from './utils/slashSkillName.ts';

const ALLOWED: TrustDecision = { allowed: true };

const NO_SKILL_NAME: TrustDecision = {
  allowed: false,
  reason: 'skill-guard could not read the skill name from the Skill tool call.',
};

const readInput = Stdio.Stdio.use(({ stdin }) =>
  stdin.pipe(Stream.decodeText(), Stream.mkString, Effect.flatMap(decodeHookInput)),
);

const decide = Effect.fn('ClaudeGate.decide')(function* (
  input: HookInput,
  cwd: string,
  projectDir: string,
) {
  const gate = yield* SkillGate;
  if (input.hook_event_name === 'UserPromptSubmit') {
    const name = slashSkillName(input.prompt ?? '', '/');
    return name === undefined ? ALLOWED : yield* gate.checkInvocation(projectDir, name);
  }
  if (input.hook_event_name === 'PreToolUse' && input.tool_name === 'Skill') {
    const name = input.tool_input?.skill ?? input.tool_input?.command ?? input.tool_input?.name;
    return name === undefined
      ? NO_SKILL_NAME
      : yield* gate.checkInvocation(projectDir, name.replace(/^\//, ''));
  }
  if (input.hook_event_name === 'PreToolUse' && input.tool_name === 'Read') {
    const filePath = input.tool_input?.file_path;
    return filePath === undefined ? ALLOWED : yield* gate.checkFileRead(projectDir, cwd, filePath);
  }
  return ALLOWED;
});

export const claudeGateProgram = Effect.gen(function* () {
  const input = yield* readInput.pipe(
    Effect.catchCause((cause) =>
      Console.error(`skill-guard: ${describeCause(cause)}`).pipe(Effect.andThen(new GateFailure())),
    ),
  );
  const env = yield* Environment;
  const cwd = input.cwd ?? env.cwd;
  const projectDir = Option.getOrElse(env.claudeProjectDir, () => cwd);
  const decision = yield* decide(input, cwd, projectDir).pipe(
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
