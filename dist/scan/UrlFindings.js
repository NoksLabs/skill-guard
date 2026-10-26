                                                  
import { isDocumentationHost } from './utils/isDocumentationHost.js';
import { visibleExcerpt } from './utils/visibleExcerpt.js';

export const urlFindings = (
  file        ,
  fileSha256        ,
  lines                       ,
)                         =>
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
