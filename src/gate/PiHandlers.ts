import * as NodeServices from '@effect/platform-node/NodeServices';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { describeCause } from '../shared/utils/describeCause.ts';
import type { TrustDecision } from '../trust/types/TrustDecision.ts';
import { SkillGate } from './SkillGate.ts';
import type { GateError } from './types/GateError.ts';
import type {
  PiContext,
  PiInputEvent,
  PiInputResult,
  PiToolCallEvent,
  PiToolCallResult,
} from './types/PiApi.ts';
import { slashSkillName } from './utils/slashSkillName.ts';

const runtime = ManagedRuntime.make(SkillGate.Layer.pipe(Layer.provide(NodeServices.layer)));

const denialReason = (
  check: Effect.Effect<TrustDecision, GateError, SkillGate>,
): Promise<string | undefined> =>
  runtime.runPromise(
    check.pipe(
      Effect.map((decision) => (decision.allowed ? undefined : `skill-guard: ${decision.reason}`)),
      Effect.catchCause((cause) =>
        Effect.succeed(`skill-guard: check failed: ${describeCause(cause)}`),
      ),
    ),
  );

export const onPiInput = async (event: PiInputEvent, ctx: PiContext): Promise<PiInputResult> => {
  const name = slashSkillName(event.text, '/skill:');
  if (name === undefined) {
    return { action: 'continue' };
  }
  const reason = await denialReason(
    SkillGate.use((gate) =>
      gate
        .projectRootOf(ctx.cwd)
        .pipe(Effect.flatMap((projectDir) => gate.checkInvocation(projectDir, name))),
    ),
  );
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
  const path = event.input.path;
  if (event.toolName !== 'read' || path === undefined) {
    return undefined;
  }
  const reason = await denialReason(
    SkillGate.use((gate) =>
      gate
        .projectRootOf(ctx.cwd)
        .pipe(Effect.flatMap((projectDir) => gate.checkFileRead(projectDir, ctx.cwd, path))),
    ),
  );
  return reason === undefined ? undefined : { block: true, reason };
};
