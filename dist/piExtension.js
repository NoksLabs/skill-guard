import * as NodeServices from '@effect/platform-node/NodeServices';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { checkSkillFileRead, checkSkillInvocation, slashSkillName } from './skillGate.js';
import { projectRootOf } from './skillRoots.js';
                                                        

                     
                       
                                                                                                   
  

                                            

                      
                            
                                             
  

                                                               

                                                                                        

                 
                
     
                     
                                                                                            
            
     
                         
                                                                                                     
            
    
  

const runtime = ManagedRuntime.make(NodeServices.layer);

const reasonFor = (check                                                                                               )                              =>
  runtime.runPromise(
    check.pipe(
      Effect.map((decision) => (decision.allowed ? undefined : `skill-guard: ${decision.reason}`)),
      Effect.catchCause((cause) => {
        const error = Cause.squash(cause);
        return Effect.succeed(`skill-guard: check failed: ${error instanceof Error ? error.message : String(error)}`);
      }),
    ),
  );

export default function skillsGuard(pi          )       {
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
