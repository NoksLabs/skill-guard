import { BLOB_RULES } from './constants/BlobRules.ts';
import { MARKDOWN_EXTENSIONS } from './constants/FileExtensions.ts';
import { TEXT_RULES } from './constants/TextRules.ts';
import { isBinary, structuralFindings } from './StructuralFindings.ts';
import { blobFindings, lineFindings } from './TextFindings.ts';
import type { Finding } from './types/Finding.ts';
import type { TargetFile } from './types/TargetFile.ts';
import { urlFindings } from './UrlFindings.ts';
import { fileKindOf } from './utils/fileKindOf.ts';

const decoder = new TextDecoder();

export const fileFindings = (
  target: TargetFile,
  fileSha256: string,
  extension: string,
): ReadonlyArray<Finding> => {
  const structural = structuralFindings(target, fileSha256, extension);
  if (isBinary(target.content)) {
    return structural;
  }
  const kind = fileKindOf(extension);
  const content = decoder.decode(target.content);
  const lines = content.split('\n');
  return [
    ...structural,
    ...TEXT_RULES.flatMap((rule) => {
      const severity = rule.severity[kind];
      return severity === undefined
        ? []
        : lineFindings(target.file, fileSha256, lines, rule, severity);
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
