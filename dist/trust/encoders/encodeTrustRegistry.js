                                                                 

export const encodeTrustRegistry = (registry               )         => {
  const sorted                = {
    version: 1,
    entries: Object.fromEntries(
      Object.entries(registry.entries).toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    ),
  };
  return `${JSON.stringify(sorted, null, 2)}\n`;
};
