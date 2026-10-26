                                                        
import { everywhere } from '../../utils/everywhere.js';

export const SUPPLY_CHAIN_RULES                          = [
  {
    id: 'remote-instructions',
    pattern:
      /\b(read|follow|see|check|consult|load|fetch|open|use)\b[^.\n]{0,60}https?:\/\/(raw\.githubusercontent\.com\/\S+|gist\.github(usercontent)?\.com\/\S+|github\.com\/[^\s/]+\/[^\s/]+\/(blob|tree|raw)\/\S+)/i,
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
  {
    id: 'install-hook',
    pattern:
      /["'](preinstall|install|postinstall|preuninstall|postuninstall|prepublish)["']\s*:|\bcmdclass\s*=|\[tool\.setuptools\.cmdclass\]/,
    severity: { prose: undefined, code: 'MEDIUM', config: 'HIGH' },
    message: 'Package lifecycle script that runs on install',
  },
  {
    id: 'unpinned-remote',
    pattern:
      /raw\.githubusercontent\.com\/[^/\s]+\/[^/\s]+\/(refs\/heads\/)?(main|master|HEAD|latest|develop|dev)\/|\b(npx|bunx|pnpm\s+dlx|yarn\s+dlx|npm\s+(i|install)|pnpm\s+add|yarn\s+add)\s+(-\S+\s+)*[@\w./-]+@(latest|next|canary|\*)(\s|$)|\b(pip3?|uv\s+pip|pipx)\s+(install|run)\s+[^\n]*git\+https?:\/\/[^\s@#]+(\s|$)|\bgithub:[\w-]+\/[\w.-]+(?![#\w.-])/,
    severity: everywhere('MEDIUM'),
    message: 'Fetches a moving ref (branch or @latest) instead of a pinned version',
  },
  {
    id: 'opaque-url',
    pattern:
      /https?:\/\/(?!(127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.))\d{1,3}(\.\d{1,3}){3}\b|https?:\/\/(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|cutt\.ly|rebrand\.ly|ow\.ly|shorturl\.at|rb\.gy)\/|\b[\w-]+\.(ngrok(-free)?\.(io|app|dev)|trycloudflare\.com|loca\.lt|serveo\.net)\b/i,
    severity: everywhere('MEDIUM'),
    message: 'URL that hides its destination (raw public IP, link shortener or tunnel)',
  },
];
