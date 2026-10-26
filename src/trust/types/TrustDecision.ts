export type TrustDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: string };
