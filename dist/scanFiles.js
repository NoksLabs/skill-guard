import { extname } from 'node:path';

import {
  BLOB_RULES,
                
  isDocumentationHost,
                
  TEXT_RULES,
                
} from './scanRules.js';
import { sha256 } from './skillFiles.js';

                       
                        
                              
                        
                        
                           
                           
                              
  

const MAX_FILE_BYTES = 512 * 1024;

const CODE_EXTENSIONS                      = new Set([
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

const CONFIG_EXTENSIONS                      = new Set(['.json', '.yaml', '.yml', '.toml', '.ini']);

const MARKDOWN_EXTENSIONS                      = new Set(['.md', '.mdx', '.markdown']);

const MEDIA_EXTENSIONS                      = new Set([
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

export const fileKindOf = (path        )           => {
  const extension = extname(path).toLowerCase();
  return CODE_EXTENSIONS.has(extension)
    ? 'code'
    : CONFIG_EXTENSIONS.has(extension)
      ? 'config'
      : 'prose';
};

const visible = (text        )         =>
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

const lineAt = (content        , index        )         =>
  content.slice(0, index).split('\n').length;

const lineFindings = (
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
            excerpt: visible(text.slice(Math.max(0, match.index - 40), match.index + 100)),
            fileSha256,
          },
        ];
  });

const blobFindings = (
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
      excerpt: visible(match[0].slice(0, 100)),
      fileSha256,
    }),
  );

const urlFindings = (
  file        ,
  fileSha256        ,
  lines                       ,
)                         =>
  lines.flatMap((text, index) =>
    Array.from(text.matchAll(/\bhttps?:\/\/([a-z0-9.-]+)/gi))
      .filter((match) => !isDocumentationHost((match[1] ?? '').toLowerCase()))
      .map((match) => ({
        rule: 'external-url',
        severity: 'LOW'         ,
        file,
        line: index + 1,
        message: `URL outside the documentation allowlist (${match[1] ?? ''})`,
        excerpt: visible(match[0]),
        fileSha256,
      })),
  );

const fileLevel = (
  file        ,
  fileSha256        ,
  rule        ,
  severity          ,
  message        ,
)          => ({ rule, severity, file, line: 0, message, excerpt: '', fileSha256 });

export const scanContent = (p   
                        
                           
                                            
 )                         => {
  const fileSha256 = sha256(p.content);
  const extension = extname(p.file).toLowerCase();
  const isBinary = p.content.subarray(0, 8192).includes(0);
  const structural = [
    ...(p.escapesRoot === undefined
      ? []
      : [
          fileLevel(
            p.file,
            fileSha256,
            'symlink-escape',
            'HIGH',
            `Symlink leaves its root: ${p.escapesRoot}`,
          ),
        ]),
    ...(p.content.length > MAX_FILE_BYTES
      ? [
          fileLevel(
            p.file,
            fileSha256,
            'oversized-file',
            'MEDIUM',
            `File is ${p.content.length} bytes`,
          ),
        ]
      : []),
    ...(isBinary
      ? [
          fileLevel(
            p.file,
            fileSha256,
            'binary-file',
            MEDIA_EXTENSIONS.has(extension) ? 'LOW' : 'MEDIUM',
            'Binary file',
          ),
        ]
      : []),
  ];
  if (isBinary) {
    return structural;
  }
  const kind = fileKindOf(p.file);
  const content = p.content.toString('utf8');
  const lines = content.split('\n');
  return [
    ...structural,
    ...TEXT_RULES.flatMap((rule) => {
      const severity = rule.severity[kind];
      return severity === undefined ? [] : lineFindings(p.file, fileSha256, lines, rule, severity);
    }),
    ...BLOB_RULES.flatMap((rule) => {
      const severity =
        rule.id === 'html-comment' && !MARKDOWN_EXTENSIONS.has(extension)
          ? undefined
          : rule.severity[kind];
      return severity === undefined
        ? []
        : blobFindings(p.file, fileSha256, content, rule, severity);
    }),
    ...urlFindings(p.file, fileSha256, lines),
  ];
};
