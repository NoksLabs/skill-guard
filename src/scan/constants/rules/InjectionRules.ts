import type { TextRule } from '../../types/TextRule.ts';
import { everywhere } from '../../utils/everywhere.ts';

export const INJECTION_RULES: ReadonlyArray<TextRule> = [
  {
    id: 'hidden-unicode',
    pattern:
      /[​‌‎‏‪-‮⁠-⁤⁦-⁩­]|(?<![\p{Extended_Pictographic}\p{Emoji_Modifier}️])‍|[\u{E0000}-\u{E007F}]|(?<!^)﻿/u,
    severity: everywhere('HIGH'),
    message: 'Invisible, bidi, zero-width or Unicode tag character',
    rawOnly: true,
  },
  {
    id: 'hijack-phrase',
    pattern:
      /\b(ignore|disregard|forget|override|drop|abandon|discard|set\s+aside)\s+(all\s+|any\s+|the\s+|your\s+|every\s+)*(previous|prior|above|earlier|preceding|existing|system|original|operator|developer)\s+(instructions?|prompts?|rules|messages|guidance|guidelines|directives|context|constraints|polic(y|ies))\b|\byou\s+are\s+now\s+(a|an|in|the|DAN|no\s+longer)\b|\b(do\s+not|don'?t|never)\s+(tell|inform|notify|alert|mention\s+(this\s+|it\s+)?to|reveal\s+(this\s+|it\s+)?to|show\s+(this\s+|it\s+)?to)\s+the\s+(user|person|human|operator)\b|\bwithout\s+(telling|informing|asking|notifying|alerting)\s+the\s+(user|person|human|operator)\b|\b(keep|hide)\s+(this|these|it|the\s+following)(\s+\w+){0,2}\s+(secret|private|hidden|confidential)\s+from\b|\b(silently|secretly|covertly)\s+(run|execute|send|upload|post|read|copy|install|delete)\b|\b(disable|bypass|turn\s+off|ignore)\s+(the\s+|all\s+|any\s+|your\s+)?(safety|guardrails?|security\s+checks?|permission\s+(checks?|prompts?)|content\s+polic(y|ies))\b|\b(jailbreak|developer\s+mode\s+enabled|DAN\s+mode)\b|\bnew\s+system\s+prompt\b|\b(this|these)\s+(skill|file|instructions?|rules?)\s+(takes?|has|have)\s+(priority|precedence)\s+over\b|\b(supersedes?|overrides?)\s+(all\s+|any\s+)?(other|previous|prior|system)\s+(instructions|rules|prompts?)\b/im,
    severity: everywhere('HIGH'),
    message: 'Instruction-hijack, concealment or priority-override phrase',
  },
  {
    id: 'role-spoofing',
    pattern:
      /<\|?(im_start|im_end|endoftext|start_header_id|eot_id)\|?>|<\/?(system|system-reminder|system_prompt|instructions)>|\[\/?(INST|SYS)\]|<<\/?SYS>>|^\s*(system\s*prompt|\[system\])\s*:?/im,
    severity: everywhere('HIGH'),
    message: 'Fake chat-role token or system tag that impersonates the harness',
  },
  {
    id: 'chat-turn-label',
    pattern: /^\s*(\*\*)?(human|assistant|system)(\*\*)?\s*:\s+\S/i,
    severity: { prose: 'MEDIUM', code: undefined, config: undefined },
    message: 'Line starts with a chat role label (possible injected conversation turn)',
  },
  {
    id: 'mixed-script',
    pattern:
      /(?<![\p{L}\p{M}])(?=[\p{L}\p{M}]*\p{Script=Latin})(?=[\p{L}\p{M}]*[\p{Script=Cyrillic}αεικνορτυχΑΒΕΖΗΙΚΜΝΟΡΤΥΧ])[\p{L}\p{M}]{2,}/u,
    severity: { prose: 'HIGH', code: 'MEDIUM', config: 'MEDIUM' },
    message: 'Word mixes Latin with Cyrillic or Greek letters (homoglyph disguise)',
    rawOnly: true,
  },
  {
    id: 'description-directive',
    pattern:
      /^\s*description:\s*[^\n]*\b(always\s+(run|invoke|call|execute|load)|important(\s+for|\s*:)|must\s+(be\s+)?(run|invoked|loaded|called)|before\s+(any|every|all)\s+(other\s+)?(tasks?|requests?|responses?|actions?|tools?)|(run|invoke|load|call)\s+(this|me)\s+first|regardless\s+of|instead\s+of\s+(any|the)\s+other)/i,
    severity: { prose: 'MEDIUM', code: undefined, config: undefined },
    message:
      'Skill description gives the agent standing orders (descriptions are always in context)',
  },
];
