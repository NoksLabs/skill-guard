import * as NodeRuntime from '@effect/platform-node/NodeRuntime';
import * as NodeServices from '@effect/platform-node/NodeServices';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { claudeGateProgram } from './gate/ClaudeGateProgram.ts';
import { ToolCallGate } from './gate/ToolCallGate.ts';
import { Environment } from './shared/Environment.ts';

claudeGateProgram.pipe(
  Effect.provide(
    Layer.provideMerge(Layer.mergeAll(ToolCallGate.Layer, Environment.Layer), NodeServices.layer),
  ),
  NodeRuntime.runMain,
);
