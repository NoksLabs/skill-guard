                                                  
                                                    
                                                    
import { lineAt } from './utils/lineAt.js';
import { visibleExcerpt } from './utils/visibleExcerpt.js';

export const lineFindings = (
  file        ,
  fileSha256        ,
  lines                       ,
  rule          ,
  severity          ,
)                         =>
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
  file        ,
  fileSha256        ,
  content        ,
  rule          ,
  severity          ,
)                         =>
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
