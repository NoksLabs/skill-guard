import type { TrustRegistry } from '../schemas/TrustRegistry.ts';

export const encodeTrustRegistry = (registry: TrustRegistry): string => {
  const sorted: TrustRegistry = {
    version: 1,
    entries: Object.fromEntries(
      Object.entries(registry.entries).toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    ),
  };
  return `${JSON.stringify(sorted, null, 2)}\n`;
};
