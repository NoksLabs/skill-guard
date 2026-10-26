export type PiContext = {
  readonly cwd: string;
  readonly ui: { readonly notify: (message: string, type?: 'info' | 'warning' | 'error') => void };
};

export type PiInputEvent = { readonly text: string };

export type PiToolCallEvent = {
  readonly toolName: string;
  readonly input: { readonly path?: string; readonly glob?: string; readonly command?: string };
};

export type PiInputResult = { readonly action: 'continue' | 'handled' };

export type PiToolCallResult = { readonly block: boolean; readonly reason?: string } | undefined;

export type PiApi = {
  readonly on: {
    (
      event: 'input',
      handler: (event: PiInputEvent, ctx: PiContext) => PiInputResult | Promise<PiInputResult>,
    ): void;
    (
      event: 'tool_call',
      handler: (
        event: PiToolCallEvent,
        ctx: PiContext,
      ) => PiToolCallResult | Promise<PiToolCallResult>,
    ): void;
  };
};
