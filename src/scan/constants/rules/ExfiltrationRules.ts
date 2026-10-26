import type { TextRule } from '../../types/TextRule.ts';
import { everywhere } from '../../utils/everywhere.ts';

export const EXFILTRATION_RULES: ReadonlyArray<TextRule> = [
  {
    id: 'secret-path',
    pattern:
      /(^|[\s"'`(=/@])\.env(?!\.(example|sample|template|dist)\b)(\.[\w-]+)?\b|~\/\.ssh\b|\bid_(rsa|dsa|ecdsa|ed25519)\b|~\/\.aws\b|\baws_secret_access_key\b|~\/\.alchemy\b|\bkeychain\b|\bsecurity\s+(find|dump)-(generic-|internet-)?(password|keychain)\b|\bprintenv\b|\benv\s*\||(^|[\s"'`(=~/@])\.(netrc|npmrc|pypirc|git-credentials|pgpass)\b|\.docker\/config\.json|\.kube\/config\b|\.config\/(gh|gcloud)\b|\/etc\/(passwd|shadow|sudoers)\b|\.(bash|zsh)_history\b|\bLogin\s+Data\b|\bcookies\.sqlite\b|Library\/Keychains|\bwallet\.dat\b|JSON\.stringify\(\s*process\.env\s*\)|Object\.(entries|keys|values)\(\s*process\.env\s*\)|\bdict\(\s*os\.environ\s*\)|\bos\.environ\.(copy|items)\(\)/i,
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
    id: 'exfil-command',
    pattern:
      /\b(nc|ncat|netcat|socat)\s+(-[\w]+\s+)*([\w-]+\.)+[a-z]{2,}\b|\b(nc|ncat|netcat)\s+(-[\w]+\s+)*\d{1,3}(\.\d{1,3}){3}\b|\/dev\/(tcp|udp)\/|\bcurl\b[^\n]*\s(-d|--data(-binary|-raw|-urlencode)?|-F|--form|-T|--upload-file)\s+['"]?[\w-]*=?@|\bwget\b[^\n]*--post-(file|data)|\bcurl\b[^\n]*\$\(\s*(cat|env|printenv|whoami|hostname|git\s+config|security)\b/i,
    severity: everywhere('HIGH'),
    message: 'Sends local data to a remote host',
  },
  {
    id: 'remote-copy',
    pattern: /\b(scp|rsync)\b[^\n]*\s([\w.-]+@)?[\w-]+(\.[\w-]+)+:\S*/,
    severity: everywhere('MEDIUM'),
    message: 'Copies files to or from a remote host',
  },
  {
    id: 'exfil-host',
    pattern:
      /\b(webhook\.site|requestbin|pipedream\.net|interact\.sh|oast\.(fun|me|pro|live|site|online)|burpcollaborator\.net|canarytokens|pastebin\.com|paste\.ee|hastebin|transfer\.sh|0x0\.st|file\.io|termbin\.com|discord(app)?\.com\/api\/webhooks|api\.telegram\.org\/bot|hooks\.slack\.com)\b/i,
    severity: everywhere('HIGH'),
    message: 'Known data-collection or paste host',
  },
  {
    id: 'markdown-image-exfil',
    pattern:
      /!\[[^\]]*\]\(\s*https?:\/\/[^)\s]*[?&#=][^)\s]*(\{|\$|%7B|<[A-Z_]+>|\[[A-Z_]+\])|<img\b[^>]*\bsrc=['"]?https?:\/\/[^'"\s>]*[?&][^'"\s>]*(\{|\$|%7B)|\b(append|add|include|encode|embed|put)\s+(the\s+|any\s+|all\s+|your\s+)?(conversation|chat\s+history|secrets?|api\s+keys?|tokens?|credentials?|passwords?|env(ironment)?(\s+variables)?|file\s+contents?)\s+(in|into|to)\s+(the\s+|a\s+)?(url|query(\s+string)?|link|image|request|parameter)/i,
    severity: { prose: 'HIGH', code: 'MEDIUM', config: 'MEDIUM' },
    message: 'Leaks data through a URL the agent renders or requests',
  },
  {
    id: 'network-call',
    pattern:
      /\bfetch\s*\(|\bhttps?\.(request|get)\s*\(|\baxios\b|\brequests\.(get|post|put|delete)\b|\burllib\b|\bsocket\.|\bnew\s+WebSocket\b|\bXMLHttpRequest\b/,
    severity: { prose: undefined, code: 'MEDIUM', config: undefined },
    message: 'Makes network calls',
  },
];
