import * as NodeRuntime from '@effect/platform-node/NodeRuntime';
import * as NodeServices from '@effect/platform-node/NodeServices';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { CliLayer } from './cli/CliLayer.js';
import { cli, teardown } from './cli/SkillGuardCli.js';

cli.pipe(
  Effect.provide(Layer.provideMerge(CliLayer, NodeServices.layer)),
  NodeRuntime.runMain({ teardown }),
);
