import type { TextRule } from '../types/TextRule.ts';
import { everywhere } from '../utils/everywhere.ts';

export const BLOB_RULES: ReadonlyArray<TextRule> = [
  {
    id: 'html-comment',
    pattern: /<!--[\s\S]*?-->/,
    severity: { prose: 'MEDIUM', code: undefined, config: undefined },
    message: 'HTML comment (hidden from rendered Markdown)',
  },
  {
    id: 'base64-blob',
    pattern: /[A-Za-z0-9+/]{200,}={0,2}/,
    severity: everywhere('MEDIUM'),
    message: 'Long base64-like blob',
  },
  {
    id: 'hex-blob',
    pattern: /\b[0-9a-fA-F]{128,}\b/,
    severity: everywhere('MEDIUM'),
    message: 'Long hex blob',
  },
  {
    id: 'data-uri',
    pattern: /\bdata:[a-z]+\/[a-z0-9.+-]+;base64,/i,
    severity: { prose: 'MEDIUM', code: 'LOW', config: 'MEDIUM' },
    message: 'Inline data: URI',
  },
];
