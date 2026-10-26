import * as NodeServices from '@effect/platform-node/NodeServices';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { checkSkillFileRead, checkSkillInvocation, slashSkillName } from './skillGate.ts';
import { projectRootOf } from './skillRoots.ts';
import type { TrustDecision } from './trustRegistry.ts';

type GuardContext = {
  readonly cwd: string;
  readonly ui: { readonly notify: (message: string, type?: 'info' | 'warning' | 'error') => void };
};

type InputEvent = { readonly text: string };

type ToolCallEvent = {
  readonly toolName: string;
  readonly input: { readonly path?: string };
};

type InputResult = { readonly action: 'continue' | 'handled' };

type ToolCallResult = { readonly block: boolean; readonly reason?: string } | undefined;

type GuardApi = {
  readonly on: {
    (
      event: 'input',
      handler: (event: InputEvent, ctx: GuardContext) => InputResult | Promise<InputResult>,
    ): void;
    (
      event: 'tool_call',
      handler: (event: ToolCallEvent, ctx: GuardContext) => ToolCallResult | Promise<ToolCallResult>,
    ): void;
  };
};

const runtime = ManagedRuntime.make(NodeServices.layer);

const reasonFor = (check: Effect.Effect<TrustDecision, unknown, ManagedRuntime.ManagedRuntime.Services<typeof runtime>>): Promise<string | undefined> =>
  runtime.runPromise(
    check.pipe(
      Effect.map((decision) => (decision.allowed ? undefined : `skill-guard: ${decision.reason}`)),
      Effect.catchCause((cause) => {
        const error = Cause.squash(cause);
        return Effect.succeed(`skill-guard: check failed: ${error instanceof Error ? error.message : String(error)}`);
      }),
    ),
  );

export default function skillsGuard(pi: GuardApi): void {
  pi.on('input', async (event, ctx) => {
    const name = slashSkillName(event.text, '/skill:');
    if (name === undefined) {
      return { action: 'continue' };
    }
    const reason = await reasonFor(
      projectRootOf(ctx.cwd).pipe(Effect.flatMap((projectDir) => checkSkillInvocation(projectDir, name))),
    );
    if (reason === undefined) {
      return { action: 'continue' };
    }
    ctx.ui.notify(reason, 'error');
    return { action: 'handled' };
  });

  pi.on('tool_call', async (event, ctx) => {
    const path = event.input.path;
    if (event.toolName !== 'read' || path === undefined) {
      return undefined;
    }
    const reason = await reasonFor(
      projectRootOf(ctx.cwd).pipe(
        Effect.flatMap((projectDir) => checkSkillFileRead(projectDir, ctx.cwd, path)),
      ),
    );
    return reason === undefined ? undefined : { block: true, reason };
  });
}
