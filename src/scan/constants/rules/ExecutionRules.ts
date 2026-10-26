import type { TextRule } from '../../types/TextRule.ts';
import { everywhere } from '../../utils/everywhere.ts';

export const EXECUTION_RULES: ReadonlyArray<TextRule> = [
  {
    id: 'pipe-to-shell',
    pattern:
      /(^|\s)\|(?!\|)\s*(sudo\s+)?(sh|bash|zsh|node|python3?|perl|ruby|php|pwsh|powershell)\b(?!\s*--version)(\s|$|-)|\b(bash|sh|zsh|source|\.)\s+<\(\s*(curl|wget)\b|\b(sh|bash|zsh)\s+-c\s+["']?\$\(\s*(curl|wget)\b|\b(iex|Invoke-Expression)\b[^\n]*\b(iwr|irm|Invoke-WebRequest|Invoke-RestMethod|DownloadString)\b|\b(irm|iwr)\b[^\n]*\|\s*iex\b/i,
    severity: everywhere('HIGH'),
    message: 'Downloads and pipes into an interpreter',
  },
  {
    id: 'download-execute',
    pattern:
      /\b(curl|wget|Invoke-WebRequest|iwr)\b[^\n]*(&&|;|\|\|)\s*(sudo\s+)?(sh|bash|zsh|source|python3?|node|perl|ruby|chmod\s+(\+x|[0-7]{3,4})|\.\/)/i,
    severity: everywhere('HIGH'),
    message: 'Downloads a file and then runs it',
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
    id: 'inline-network-code',
    pattern:
      /\b(python3?|node|perl|ruby|php)\s+(-c|-e|--eval|-r)\s+['"][^\n]*(urlopen|urllib|requests\.|socket|http\.client|fetch\(|https?:\/\/|LWP|Net::HTTP)/,
    severity: everywhere('HIGH'),
    message: 'Inline interpreter one-liner that makes network calls',
  },
  {
    id: 'inline-code',
    pattern: /\b(python3?|node|perl|ruby|php)\s+(-c|-e|--eval|-r)\s+['"]/,
    severity: { prose: 'MEDIUM', code: 'LOW', config: 'MEDIUM' },
    message: 'Runs inline interpreter code',
  },
  {
    id: 'decode-payload',
    pattern:
      /\bbase64\s+(-d|-D|--decode)\b|\b(b64decode|a2b_base64|atob)\s*\(|Buffer\.from\([^)\n]*,\s*['"](base64|hex)['"]\)|\bFromBase64String\b|\bxxd\s+-r\b|\bcodecs\.decode\([^)\n]*rot/,
    severity: everywhere('MEDIUM'),
    message: 'Decodes an encoded payload (possible obfuscation)',
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
    id: 'prompt-automation',
    pattern:
      /\bosascript\b|\bSystem Events\b|\bAXPress\b|perform action\s+"AX|\bmac-approve\b|\btccutil\b|Privacy & Security\s*>\s*Accessibility|\bxdotool\b|\bAutoHotkey\b/i,
    severity: everywhere('HIGH'),
    message: 'Automates OS or browser security prompts (clicking Allow, Accessibility control)',
  },
];
