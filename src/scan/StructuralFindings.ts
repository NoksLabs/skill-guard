import { MAX_FILE_BYTES, MEDIA_EXTENSIONS } from './constants/FileExtensions.ts';
import type { Finding } from './types/Finding.ts';
import type { Severity } from './types/Severity.ts';
import type { TargetFile } from './types/TargetFile.ts';

const fileLevel = (
  file: string,
  fileSha256: string,
  rule: string,
  severity: Severity,
  message: string,
): Finding => ({ rule, severity, file, line: 0, message, excerpt: '', fileSha256 });

export const isBinary = (content: Uint8Array): boolean => content.subarray(0, 8192).includes(0);

export const structuralFindings = (
  target: TargetFile,
  fileSha256: string,
  extension: string,
): ReadonlyArray<Finding> => [
  ...(target.escapesRoot === undefined
    ? []
    : [
        fileLevel(
          target.file,
          fileSha256,
          'symlink-escape',
          'HIGH',
          `Symlink leaves its root: ${target.escapesRoot}`,
        ),
      ]),
  ...(target.content.length > MAX_FILE_BYTES
    ? [
        fileLevel(
          target.file,
          fileSha256,
          'oversized-file',
          'MEDIUM',
          `File is ${target.content.length} bytes`,
        ),
      ]
    : []),
  ...(isBinary(target.content)
    ? [
        fileLevel(
          target.file,
          fileSha256,
          'binary-file',
          MEDIA_EXTENSIONS.has(extension) ? 'LOW' : 'MEDIUM',
          'Binary file',
        ),
      ]
    : []),
];
