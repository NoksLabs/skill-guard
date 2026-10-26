export const concatBytes = (chunks                           )             => {
  const out = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  chunks.reduce((offset, chunk) => (out.set(chunk, offset), offset + chunk.length), 0);
  return out;
};
