export type AgentToolCall =
  | { readonly kind: 'skill'; readonly name: string | undefined }
  | { readonly kind: 'read' | 'search' | 'edit'; readonly paths: ReadonlyArray<string> }
  | { readonly kind: 'shell'; readonly command: string; readonly workdir: string | undefined }
  | { readonly kind: 'other' };
