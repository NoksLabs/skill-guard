import type { Finding } from './types/Finding.ts';
import { isDocumentationHost } from './utils/isDocumentationHost.ts';
import { visibleExcerpt } from './utils/visibleExcerpt.ts';

export const urlFindings = (
  file: string,
  fileSha256: string,
  lines: ReadonlyArray<string>,
): ReadonlyArray<Finding> =>
  lines.flatMap((text, index) =>
    Array.from(text.matchAll(/\bhttps?:\/\/([a-z0-9.-]+)/gi))
      .filter((match) => !isDocumentationHost((match[1] ?? '').toLowerCase()))
      .map((match) => ({
        rule: 'external-url',
        severity: 'LOW',
        file,
        line: index + 1,
        message: `URL outside the documentation allowlist (${match[1] ?? ''})`,
        excerpt: visibleExcerpt(match[0]),
        fileSha256,
      })),
  );
