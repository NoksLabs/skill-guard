import { checkSkillFileRead, checkSkillInvocation, slashSkillName } from './skillGate.js';
import { projectRootOf } from './skillRoots.js';
                                                        

                     
                       
                                                                                                   
  

                                            

                      
                            
                                             
  

                 
                
     
                     
                
                          
                          
                                                       
            
     
                         
                
                             
                          
                                                                             
            
    
  

const projectDirOf = (ctx              )         => projectRootOf(ctx.cwd);

const denied = (decision               )                     =>
  decision.allowed ? undefined : `skill-guard: ${decision.reason}`;

export default function skillsGuard(pi          )       {
  pi.on('input', (event, ctx) => {
    const name = slashSkillName(event.text, '/skill:');
    const reason =
      name === undefined ? undefined : denied(checkSkillInvocation(projectDirOf(ctx), name));
    if (reason === undefined) {
      return { action: 'continue' };
    }
    ctx.ui.notify(reason, 'error');
    return { action: 'handled' };
  });

  pi.on('tool_call', (event, ctx) => {
    const path = event.input.path;
    if (event.toolName !== 'read' || path === undefined) {
      return undefined;
    }
    const reason = denied(checkSkillFileRead(projectDirOf(ctx), ctx.cwd, path));
    return reason === undefined ? undefined : { block: true, reason };
  });
}
