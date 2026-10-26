                                                 

                                                   

                        
                      
                           
                                                                      
                           
  

const everywhere = (severity          ) => ({ prose: severity, code: severity, config: severity });

const DOCUMENTATION_HOSTS                        = [
  'code.claude.com',
  'docs.claude.com',
  'docs.anthropic.com',
  'www.anthropic.com',
  'developers.cloudflare.com',
  'developer.mozilla.org',
  'nodejs.org',
  'www.typescriptlang.org',
  'effect.website',
  'react.dev',
  'tanstack.com',
  'ui.shadcn.com',
  'tailwindcss.com',
  'www.w3.org',
  'schema.org',
  'json-schema.org',
  'agentskills.io',
  'example.com',
  'localhost',
  '127.0.0.1',
];

export const isDocumentationHost = (host        )          =>
  DOCUMENTATION_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));

export const TEXT_RULES                          = [
  {
    id: 'hidden-unicode',
    pattern:
      /[​‌‎‏‪-‮⁠-⁤⁦-⁩­]|(?<![\p{Extended_Pictographic}\p{Emoji_Modifier}️])‍|[\u{E0000}-\u{E007F}]|(?<!^)﻿/u,
    severity: everywhere('HIGH'),
    message: 'Invisible, bidi, zero-width or Unicode tag character',
  },
  {
    id: 'hijack-phrase',
    pattern:
      /\b(ignore|disregard|forget|override)\s+(all\s+|any\s+|the\s+|your\s+)?(previous|prior|above|earlier|system|original)\s+(instructions|prompts?|rules|messages)\b|\byou\s+are\s+now\s+(a|an|in|the|DAN|no\s+longer)\b|\b(do\s+not|don'?t|never)\s+(tell|inform|mention\s+(this\s+)?to|reveal\s+(this\s+)?to)\s+the\s+user\b|\bwithout\s+(telling|informing|asking)\s+the\s+user\b|\b(disable|bypass|turn\s+off)\s+(the\s+|all\s+|any\s+)?(safety|guardrails?|security\s+checks?|permission\s+checks?)\b|\bnew\s+system\s+prompt\b|^\s*(system\s*prompt|\[system\]|<system>)\s*:?/im,
    severity: everywhere('HIGH'),
    message: 'Instruction-hijack phrase',
  },
  {
    id: 'settings-tampering',
    pattern:
      /--dangerously[\w-]*|\bbypassPermissions\b|\bskipDangerousModePermissionPrompt\b|\b(edit|modify|update|change|overwrite|write\s+to|add\s+(an?\s+)?(\w+\s+)?to|append\s+to|insert\s+into)\s+[^.\n]{0,60}(settings(\.local)?\.json|\.claude\/|CLAUDE\.md|AGENTS\.md|\.pi\/|permission\s*mode|allowed-?tools|PreToolUse|UserPromptSubmit|SessionStart)/i,
    severity: { prose: 'HIGH', code: 'HIGH', config: 'MEDIUM' },
    message:
      'Tells the agent to change settings, permissions or hooks, or to skip permission checks',
  },
  {
    id: 'secret-path',
    pattern:
      /(^|[\s"'`(=/])\.env(\.[\w-]+)?\b(?!\.example)|~\/\.ssh\b|\bid_(rsa|ed25519)\b|~\/\.aws\b|\baws_secret_access_key\b|~\/\.alchemy\b|\bkeychain\b|\bsecurity\s+find-(generic|internet)-password\b|\bprintenv\b|\benv\s*\|/i,
    severity: { prose: 'MEDIUM', code: 'HIGH', config: 'LOW' },
    message: 'References a secret store or dumps the environment',
  },
  {
    id: 'secret-token',
    pattern: /\b(access|api|auth|bearer|refresh|secret|session|github|npm)[_ -]?(tokens?|keys?)\b/i,
    severity: { prose: 'LOW', code: 'MEDIUM', config: 'LOW' },
    message: 'Mentions credentials or tokens',
  },
  {
    id: 'pipe-to-shell',
    pattern:
      /(^|\s)\|(?!\|)\s*(sudo\s+)?(sh|bash|zsh|node|python3?|perl|ruby)\b(?!\s*--version)(\s|$|-)/,
    severity: everywhere('HIGH'),
    message: 'Downloads and pipes into an interpreter',
  },
  {
    id: 'download-command',
    pattern:
      /\b(curl|wget)\s+(-{1,2}[A-Za-z]|https?:|['"]?\$|['"]?https?:)|\b(Invoke-WebRequest|iwr)\s/,
    severity: { prose: 'MEDIUM', code: 'MEDIUM', config: 'MEDIUM' },
    message: 'Network download command',
  },
  {
    id: 'package-runner',
    pattern:
      /\b(npx|bunx|pnpm\s+dlx|yarn\s+dlx|uvx|pipx\s+run)\s+[@\w]|\bnpm\s+(i|install)\s+(-g|--global)\b|\bpip3?\s+install\b|\bbrew\s+install\b/,
    severity: everywhere('MEDIUM'),
    message: 'Runs or installs a remote package',
  },
  {
    id: 'process-exec',
    pattern:
      /\bchild_process\b|\bexecSync\b|\bexecFile(Sync)?\b|\bspawn(Sync)?\s*\(|\bexec\s*\(|\bsubprocess\.|\bos\.system\b|\bBun\.spawn\b|\bDeno\.Command\b/,
    severity: { prose: undefined, code: 'MEDIUM', config: undefined },
    message: 'Starts child processes',
  },
  {
    id: 'dynamic-eval',
    pattern: /\beval\s*\(|\bnew\s+Function\s*\(|\bvm\.run|\bexec\s*\(\s*compile\b/,
    severity: { prose: undefined, code: 'HIGH', config: undefined },
    message: 'Evaluates dynamic code',
  },
  {
    id: 'network-call',
    pattern:
      /\bfetch\s*\(|\bhttps?\.(request|get)\s*\(|\baxios\b|\brequests\.(get|post|put|delete)\b|\burllib\b|\bsocket\.|\bnew\s+WebSocket\b|\bXMLHttpRequest\b/,
    severity: { prose: undefined, code: 'MEDIUM', config: undefined },
    message: 'Makes network calls',
  },
  {
    id: 'fs-write-outside',
    pattern:
      /\b(writeFile|appendFile|createWriteStream|copyFile|rename|rm|unlink|mkdir)(Sync)?\s*\([^)\n]*(['"`]\s*(\/|~)|homedir\(|\.\.\/|process\.env\.HOME)|\bopen\s*\([^)\n]*(['"](\/|~)|\.\.\/)[^)\n]*['"][wa]\+?['"]/,
    severity: { prose: undefined, code: 'HIGH', config: undefined },
    message: 'Writes files outside its own directory',
  },
  {
    id: 'dynamic-module-load',
    pattern:
      /\bexec_module\s*\(|\bspec_from_file_location\s*\(|\bimportlib\.machinery\b|\brunpy\.run_(path|module)\b/,
    severity: { prose: 'MEDIUM', code: 'HIGH', config: undefined },
    message: 'Loads and executes code from discovered files',
  },
  {
    id: 'dynamic-import',
    pattern:
      /\bimportlib\.import_module\s*\(|\b__import__\s*\(|\bimport\s*\(\s*[^'"`\s)]|\brequire\s*\(\s*[^'"`\s)]/,
    severity: { prose: undefined, code: 'MEDIUM', config: undefined },
    message: 'Imports a module chosen at runtime',
  },
  {
    id: 'fs-write',
    pattern:
      /\bopen\s*\([^)\n]*,\s*['"][wax]b?\+?['"]|\bos\.(replace|rename|link|symlink|remove|unlink|makedirs)\s*\(|\bshutil\.(copy\w*|move|rmtree)\s*\(|\.write_(text|bytes)\s*\(|\b(writeFile|appendFile|createWriteStream|rmSync|unlinkSync|renameSync|symlinkSync)\w*\s*\(/,
    severity: { prose: undefined, code: 'MEDIUM', config: undefined },
    message: 'Writes, moves or deletes files',
  },
  {
    id: 'prompt-automation',
    pattern:
      /\bosascript\b|\bSystem Events\b|\bAXPress\b|perform action\s+"AX|\bmac-approve\b|\btccutil\b|Privacy & Security\s*>\s*Accessibility|\bxdotool\b|\bAutoHotkey\b/i,
    severity: everywhere('HIGH'),
    message: 'Automates OS or browser security prompts (clicking Allow, Accessibility control)',
  },
  {
    id: 'remote-instructions',
    pattern:
      /\b(read|follow|see|check|consult|load|fetch|open|use)\b[^.\n]{0,60}https?:\/\/(raw\.githubusercontent\.com\/\S+|gist\.github\.com\/\S+|github\.com\/[^\s/]+\/[^\s/]+\/(blob|tree|raw)\/\S+)/i,
    severity: { prose: 'HIGH', code: 'MEDIUM', config: 'MEDIUM' },
    message: 'Tells the agent to read and follow instructions hosted outside the repo',
  },
  {
    id: 'remote-instruction-link',
    pattern:
      /https?:\/\/(raw\.githubusercontent\.com\/\S+|github\.com\/[^\s/]+\/[^\s/]+\/(blob|tree)\/\S+\.md\b|\S+\/[^\s/]+\.md\b)/i,
    severity: { prose: 'MEDIUM', code: undefined, config: undefined },
    message: 'Links to a remote Markdown document (possible remote instructions)',
  },
];

export const BLOB_RULES                          = [
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
