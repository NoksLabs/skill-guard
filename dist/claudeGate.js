import * as NodeRuntime from '@effect/platform-node/NodeRuntime';
import * as NodeServices from '@effect/platform-node/NodeServices';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { claudeGateProgram } from './gate/ClaudeGateProgram.js';
import { SkillGate } from './gate/SkillGate.js';
import { Environment } from './shared/Environment.js';

claudeGateProgram.pipe(
  Effect.provide(
    Layer.provideMerge(Layer.mergeAll(SkillGate.Layer, Environment.Layer), NodeServices.layer),
  ),
  NodeRuntime.runMain,
);
