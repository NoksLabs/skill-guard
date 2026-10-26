import { MAX_FILE_BYTES, MEDIA_EXTENSIONS } from './constants/FileExtensions.js';
                                                  
                                                    
                                                        

const fileLevel = (
  file        ,
  fileSha256        ,
  rule        ,
  severity          ,
  message        ,
)          => ({ rule, severity, file, line: 0, message, excerpt: '', fileSha256 });

export const isBinary = (content            )          => content.subarray(0, 8192).includes(0);

export const structuralFindings = (
  target            ,
  fileSha256        ,
  extension        ,
)                         => [
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
