import * as NodeServices from '@effect/platform-node/NodeServices';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { describeCause } from '../shared/utils/describeCause.ts';
import type { TrustDecision } from '../trust/types/TrustDecision.ts';
import { ToolCallGate } from './ToolCallGate.ts';
import type { AgentToolCall } from './types/AgentToolCall.ts';
import type { GateError } from './types/GateError.ts';

const runtime = ManagedRuntime.make(ToolCallGate.Layer.pipe(Layer.provide(NodeServices.layer)));

const denialReason = (
  check: (
    gate: typeof ToolCallGate.Service,
    projectDir: string,
  ) => Effect.Effect<TrustDecision, GateError>,
  cwd: string,
): Promise<string | undefined> =>
  runtime.runPromise(
    ToolCallGate.use((gate) =>
      gate.projectRootOf(cwd).pipe(Effect.flatMap((projectDir) => check(gate, projectDir))),
    ).pipe(
      Effect.map((decision) => (decision.allowed ? undefined : `skill-guard: ${decision.reason}`)),
      Effect.catchCause((cause) =>
        Effect.succeed(`skill-guard: check failed: ${describeCause(cause)}`),
      ),
    ),
  );

export const promptDenialReason = (
  prompt: string,
  slashPrefix: string,
  cwd: string,
): Promise<string | undefined> =>
  denialReason((gate, projectDir) => gate.checkPrompt(projectDir, prompt, slashPrefix), cwd);

export const toolCallDenialReason = (
  call: AgentToolCall,
  cwd: string,
): Promise<string | undefined> =>
  denialReason((gate, projectDir) => gate.checkCall(projectDir, cwd, call), cwd);
