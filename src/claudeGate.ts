import * as NodeRuntime from '@effect/platform-node/NodeRuntime';
import * as NodeServices from '@effect/platform-node/NodeServices';
import * as Cause from 'effect/Cause';
import * as Console from 'effect/Console';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Runtime from 'effect/Runtime';
import * as Schema from 'effect/Schema';
import * as Stdio from 'effect/Stdio';
import * as Stream from 'effect/Stream';

import { checkSkillFileRead, checkSkillInvocation, slashSkillName } from './skillGate.ts';
import type { TrustDecision } from './trustRegistry.ts';

const ToolInput = Schema.Struct({
  skill: Schema.optionalKey(Schema.String),
  command: Schema.optionalKey(Schema.String),
  name: Schema.optionalKey(Schema.String),
  file_path: Schema.optionalKey(Schema.String),
});

const HookInput = Schema.Struct({
  hook_event_name: Schema.optionalKey(Schema.String),
  cwd: Schema.optionalKey(Schema.String),
  tool_name: Schema.optionalKey(Schema.String),
  tool_input: Schema.optionalKey(ToolInput),
  prompt: Schema.optionalKey(Schema.String),
});

type HookInput = typeof HookInput.Type;

const decodeHookInput = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.NullOr(HookInput)));

class GateFailure extends Data.TaggedError('GateFailure') {
  override readonly [Runtime.errorExitCode] = 2;
  override readonly [Runtime.errorReported] = false;
}

const ALLOWED: TrustDecision = { allowed: true };

const readInput = Stdio.Stdio.use(({ stdin }) =>
  stdin.pipe(Stream.decodeText(), Stream.mkString, Effect.flatMap(decodeHookInput)),
).pipe(Effect.map((parsed) => parsed ?? {}));

const failsClosed = (input: HookInput): boolean =>
  input.hook_event_name === 'UserPromptSubmit' ||
  (input.hook_event_name === 'PreToolUse' && input.tool_name === 'Skill');

const decisionFor = (input: HookInput, cwd: string, projectDir: string) => {
  if (input.hook_event_name === 'UserPromptSubmit') {
    const name = slashSkillName(input.prompt ?? '', '/');
    return name === undefined ? Effect.succeed(ALLOWED) : checkSkillInvocation(projectDir, name);
  }
  if (input.hook_event_name === 'PreToolUse' && input.tool_name === 'Skill') {
    const name = input.tool_input?.skill ?? input.tool_input?.command ?? input.tool_input?.name;
    return name === undefined
      ? Effect.succeed<TrustDecision>({
          allowed: false,
          reason: 'skill-guard could not read the skill name from the Skill tool call.',
        })
      : checkSkillInvocation(projectDir, name.replace(/^\//, ''));
  }
  if (input.hook_event_name === 'PreToolUse' && input.tool_name === 'Read') {
    const filePath = input.tool_input?.file_path;
    return filePath === undefined
      ? Effect.succeed(ALLOWED)
      : checkSkillFileRead(projectDir, cwd, filePath);
  }
  return Effect.succeed(ALLOWED);
};

const describe = (cause: Cause.Cause<unknown>): string => {
  const error = Cause.squash(cause);
  return error instanceof Error ? error.message : String(error);
};

const output = (input: HookInput, decision: TrustDecision): string | undefined =>
  decision.allowed
    ? undefined
    : JSON.stringify(
        input.hook_event_name === 'UserPromptSubmit'
          ? { decision: 'block', reason: `skill-guard: ${decision.reason}` }
          : {
              hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: `skill-guard: ${decision.reason}`,
              },
            },
      );

const main = Effect.gen(function* () {
  const input = yield* readInput.pipe(
    Effect.catchCause((cause) =>
      Console.error(`skill-guard: ${describe(cause)}`).pipe(Effect.andThen(new GateFailure())),
    ),
  );
  const cwd = input.cwd ?? process.cwd();
  const projectDir = process.env['CLAUDE_PROJECT_DIR'] ?? cwd;
  const decision = yield* decisionFor(input, cwd, projectDir).pipe(
    Effect.catchCause((cause) =>
      Console.error(`skill-guard: ${describe(cause)}`).pipe(
        Effect.andThen(failsClosed(input) ? new GateFailure() : Effect.succeed(ALLOWED)),
      ),
    ),
  );
  const line = output(input, decision);
  if (line !== undefined) {
    yield* Console.log(line);
  }
});

main.pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain);
