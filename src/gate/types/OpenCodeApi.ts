export type OpenCodePluginInput = {
  readonly directory: string;
  readonly worktree: string;
};

export type OpenCodeToolArgs = {
  readonly filePath?: string;
  readonly path?: string;
  readonly include?: string;
  readonly command?: string;
  readonly workdir?: string;
  readonly name?: string;
  readonly id?: string;
};

export type OpenCodeToolInput = { readonly tool: string };

export type OpenCodeToolOutput = { readonly args: OpenCodeToolArgs };

export type OpenCodeHooks = {
  readonly 'tool.execute.before': (
    input: OpenCodeToolInput,
    output: OpenCodeToolOutput,
  ) => Promise<void>;
};
