export const MAX_FILE_BYTES = 512 * 1024;

export const CODE_EXTENSIONS: ReadonlySet<string> = new Set([
  '.ts',
  '.mts',
  '.cts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.jsx',
  '.py',
  '.sh',
  '.bash',
  '.zsh',
  '.fish',
  '.rb',
  '.go',
  '.rs',
  '.php',
  '.pl',
  '.ps1',
  '.lua',
]);

export const CONFIG_EXTENSIONS: ReadonlySet<string> = new Set([
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
]);

export const MARKDOWN_EXTENSIONS: ReadonlySet<string> = new Set(['.md', '.mdx', '.markdown']);

export const MEDIA_EXTENSIONS: ReadonlySet<string> = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.pdf',
]);
