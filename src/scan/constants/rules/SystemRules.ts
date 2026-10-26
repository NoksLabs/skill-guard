import type { TextRule } from '../../types/TextRule.ts';
import { everywhere } from '../../utils/everywhere.ts';

export const SYSTEM_RULES: ReadonlyArray<TextRule> = [
  {
    id: 'settings-tampering',
    pattern:
      /--dangerously[\w-]*|--yolo\b|\bbypassPermissions\b|\bskipDangerousModePermissionPrompt\b|\bapproval[_-]policy\s*=\s*['"]?never\b|\bdanger-full-access\b|\b(edit|modify|update|change|overwrite|write\s+to|add\s+(an?\s+)?(\w+\s+){0,2}to|append\s+to|insert\s+into)\s+[^.\n]{0,60}(settings(\.local)?\.json|\.claude\/|CLAUDE\.md|AGENTS\.md|\.pi\/|\.codex\/|config\.toml|hooks\.json|opencode\.json|\.opencode\/|skills-trust\.json|permission\s*mode|allowed-?tools|PreToolUse|UserPromptSubmit|SessionStart)/i,
    severity: { prose: 'HIGH', code: 'HIGH', config: 'MEDIUM' },
    message:
      'Tells the agent to change settings, permissions or hooks, or to skip permission checks',
  },
  {
    id: 'persistence',
    pattern:
      /(>>?|\btee(\s+-a)?)\s*["']?(~|\$HOME|\$\{HOME\})?\/?[\w./-]*\.(bashrc|zshrc|bash_profile|zprofile|profile|zshenv|zlogin)\b|\.config\/fish\/config\.fish|\bcrontab\b(?!\s+-l\b)|\/(LaunchAgents|LaunchDaemons)\b|\blaunchctl\s+(load|bootstrap|submit)\b|\bsystemctl\s+(--user\s+)?enable\b|\/etc\/(cron|rc\.local|init\.d|systemd)|\bschtasks\s+\/create\b|CurrentVersion\\\\Run\b/i,
    severity: everywhere('HIGH'),
    message:
      'Installs something that runs again later (shell profile, cron, launch agent, service)',
  },
  {
    id: 'destructive-command',
    pattern:
      /\brm\s+-[a-zA-Z]*[rR][a-zA-Z]*\s+(-[\w-]+\s+)*["']?(\/|~|\$HOME|\$\{HOME\})["']?(\/\*?)?(\s|$)|\brm\s+-[a-zA-Z]*[rR][a-zA-Z]*\s+(-[\w-]+\s+)*\/\*|\bmkfs(\.\w+)?\b|\bdd\s+[^\n]*\bof=\/dev\/(sd|disk|nvme|hd)|:\(\)\s*\{\s*:\|:&\s*\};:|\bchmod\s+-R\s+0?777\s+\/(\s|$)|\bgit\s+push\s+[^\n]*(--force|-f)\b[^\n]*\b(main|master)\b|\bshred\s/,
    severity: everywhere('HIGH'),
    message: 'Destroys data or the system',
  },
  {
    id: 'security-weakening',
    pattern:
      /\bNODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0|\bverify\s*=\s*False\b|\bcurl\b[^\n]*\s(-k|--insecure)\b|\bstrict-ssl\s+false\b|--no-verify\b|\bcore\.hooksPath\b|\bchmod\s+(-R\s+)?0?777\b|\bunset\s+HISTFILE\b|\bset\s+\+o\s+history\b|\bhistory\s+-c\b|\bspctl\s+--master-disable\b|\bcsrutil\s+disable\b|\bxattr\s+-[a-z]*d[a-z]*\s+com\.apple\.quarantine\b|\bsetenforce\s+0\b|\bufw\s+disable\b|--disable-web-security\b/,
    severity: everywhere('MEDIUM'),
    message: 'Turns off a security check (TLS, git hooks, quarantine, history, firewall)',
  },
  {
    id: 'fs-write-outside',
    pattern:
      /\b(writeFile|appendFile|createWriteStream|copyFile|rename|rm|unlink|mkdir)(Sync)?\s*\([^)\n]*(['"`]\s*(\/|~)|homedir\(|\.\.\/|process\.env\.HOME)|\bopen\s*\([^)\n]*(['"](\/|~)|\.\.\/)[^)\n]*['"][wa]\+?['"]/,
    severity: { prose: undefined, code: 'HIGH', config: undefined },
    message: 'Writes files outside its own directory',
  },
  {
    id: 'fs-write',
    pattern:
      /\bopen\s*\([^)\n]*,\s*['"][wax]b?\+?['"]|\bos\.(replace|rename|link|symlink|remove|unlink|makedirs)\s*\(|\bshutil\.(copy\w*|move|rmtree)\s*\(|\.write_(text|bytes)\s*\(|\b(writeFile|appendFile|createWriteStream|rmSync|unlinkSync|renameSync|symlinkSync)\w*\s*\(/,
    severity: { prose: undefined, code: 'MEDIUM', config: undefined },
    message: 'Writes, moves or deletes files',
  },
];
