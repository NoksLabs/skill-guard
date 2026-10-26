export type TargetFile = {
  readonly file: string;
  readonly content: Uint8Array;
  readonly escapesRoot: string | undefined;
};
