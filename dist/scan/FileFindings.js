import { BLOB_RULES } from './constants/BlobRules.js';
import { MARKDOWN_EXTENSIONS } from './constants/FileExtensions.js';
import { TEXT_RULES } from './constants/TextRules.js';
import { isBinary, structuralFindings } from './StructuralFindings.js';
import { blobFindings, lineFindings } from './TextFindings.js';
                                                  
                                                        
import { urlFindings } from './UrlFindings.js';
import { fileKindOf } from './utils/fileKindOf.js';
import { foldConfusables } from './utils/foldConfusables.js';

const decoder = new TextDecoder();

export const fileFindings = (
  target            ,
  fileSha256        ,
  extension        ,
)                         => {
  const structural = structuralFindings(target, fileSha256, extension);
  if (isBinary(target.content)) {
    return structural;
  }
  const kind = fileKindOf(extension);
  const content = decoder.decode(target.content);
  const lines = content.split('\n');
  const foldedLines = lines.map(foldConfusables);
  return [
    ...structural,
    ...TEXT_RULES.flatMap((rule) => {
      const severity = rule.severity[kind];
      return severity === undefined
        ? []
        : lineFindings(target.file, fileSha256, lines, foldedLines, rule, severity);
    }),
    ...BLOB_RULES.flatMap((rule) => {
      const severity =
        rule.id === 'html-comment' && !MARKDOWN_EXTENSIONS.has(extension)
          ? undefined
          : rule.severity[kind];
      return severity === undefined
        ? []
        : blobFindings(target.file, fileSha256, content, rule, severity);
    }),
    ...urlFindings(target.file, fileSha256, lines),
  ];
};
