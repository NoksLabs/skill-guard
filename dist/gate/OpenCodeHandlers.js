import { toolCallDenialReason } from './HandlerRuntime.js';
             
                
                      
                    
                     
                                
import { openCodeToolCall } from './utils/openCodeToolCall.js';

export const openCodeHooks = (plugin                     )                => ({
  'tool.execute.before': async (input                   , output                    ) => {
    const reason = await toolCallDenialReason(
      openCodeToolCall(input.tool, output.args),
      plugin.directory,
    );
    if (reason !== undefined) {
      throw new Error(reason);
    }
  },
});
