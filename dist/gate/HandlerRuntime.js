import * as NodeServices from '@effect/platform-node/NodeServices';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { describeCause } from '../shared/utils/describeCause.js';
                                                                     
import { ToolCallGate } from './ToolCallGate.js';
                                                              
                                                      

const runtime = ManagedRuntime.make(ToolCallGate.Layer.pipe(Layer.provide(NodeServices.layer)));

const denialReason = (
  check   
                                      
                       
                                              ,
  cwd        ,
)                              =>
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
  prompt        ,
  slashPrefix        ,
  cwd        ,
)                              =>
  denialReason((gate, projectDir) => gate.checkPrompt(projectDir, prompt, slashPrefix), cwd);

export const toolCallDenialReason = (
  call               ,
  cwd        ,
)                              =>
  denialReason((gate, projectDir) => gate.checkCall(projectDir, cwd, call), cwd);
