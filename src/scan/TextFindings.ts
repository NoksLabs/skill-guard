import type { Finding } from './types/Finding.ts';
import type { Severity } from './types/Severity.ts';
import type { TextRule } from './types/TextRule.ts';
import { lineAt } from './utils/lineAt.ts';
import { visibleExcerpt } from './utils/visibleExcerpt.ts';

export const lineFindings = (
  file: string,
  fileSha256: string,
  lines: ReadonlyArray<string>,
  rule: TextRule,
  severity: Severity,
): ReadonlyArray<Finding> =>
  lines.flatMap((text, index) => {
    const match = rule.pattern.exec(text);
    return match === null
      ? []
      : [
          {
            rule: rule.id,
            severity,
            file,
            line: index + 1,
            message: rule.message,
            excerpt: visibleExcerpt(text.slice(Math.max(0, match.index - 40), match.index + 100)),
            fileSha256,
          },
        ];
  });

export const blobFindings = (
  file: string,
  fileSha256: string,
  content: string,
  rule: TextRule,
  severity: Severity,
): ReadonlyArray<Finding> =>
  Array.from(content.matchAll(new RegExp(rule.pattern.source, `${rule.pattern.flags}g`))).map(
    (match) => ({
      rule: rule.id,
      severity,
      file,
      line: lineAt(content, match.index),
      message: rule.message,
      excerpt: visibleExcerpt(match[0].slice(0, 100)),
      fileSha256,
    }),
  );
