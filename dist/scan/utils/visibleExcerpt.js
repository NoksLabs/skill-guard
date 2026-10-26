export const visibleExcerpt = (text        )         =>
  Array.from(text)
    .map((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code < 0x20 || (code >= 0x7f && code <= 0xa0) || code === 0xad || code > 0x2000
        ? `\\u{${code.toString(16)}}`
        : char;
    })
    .join('')
    .replace(
      /[A-Za-z0-9_+/=-]{24,}/g,
      (secretLike) => `${secretLike.slice(0, 4)}…[${secretLike.length}]`,
    )
    .trim()
    .slice(0, 140);
