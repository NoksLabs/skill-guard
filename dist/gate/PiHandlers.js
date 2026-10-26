import * as NodeServices from '@effect/platform-node/NodeServices';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { describeCause } from '../shared/utils/describeCause.js';
                                                                     
import { SkillGate } from './SkillGate.js';
                                                      
             
            
               
                
                  
                   
                          
import { slashSkillName } from './utils/slashSkillName.js';

const runtime = ManagedRuntime.make(SkillGate.Layer.pipe(Layer.provide(NodeServices.layer)));

const denialReason = (
  check                                                    ,
)                              =>
  runtime.runPromise(
    check.pipe(
      Effect.map((decision) => (decision.allowed ? undefined : `skill-guard: ${decision.reason}`)),
      Effect.catchCause((cause) =>
        Effect.succeed(`skill-guard: check failed: ${describeCause(cause)}`),
      ),
    ),
  );

export const onPiInput = async (event              , ctx           )                         => {
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
  event                 ,
  ctx           ,
)                            => {
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
