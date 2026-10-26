export const lineAt = (content: string, index: number): number =>
  content.slice(0, index).split('\n').length;
