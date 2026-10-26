import { promptDenialReason, toolCallDenialReason } from './HandlerRuntime.js';
             
            
               
                
                  
                   
                          
import { piToolCall } from './utils/piToolCall.js';

export const onPiInput = async (event              , ctx           )                         => {
  const reason = await promptDenialReason(event.text, '/skill:', ctx.cwd);
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
  const reason = await toolCallDenialReason(piToolCall(event), ctx.cwd);
  return reason === undefined ? undefined : { block: true, reason };
};
