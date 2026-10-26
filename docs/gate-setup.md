# Gate setup

## Claude Code hook (project)

Add to the project's `.claude/settings.json` after the first approvals. The hook needs to find
the package; with `npm install -D skill-guard` that is `node_modules/skill-guard`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Skill|Read|Edit|MultiEdit|Grep|Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/node_modules/skill-guard/dist/claudeGate.js\"",
            "timeout": 10
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/node_modules/skill-guard/dist/claudeGate.js\"",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

The Skill tool call is denied through `hookSpecificOutput.permissionDecision: "deny"`, a typed
`/name` prompt through `{ "decision": "block" }`, and a Read of any file inside a skill directory
(through symlinks too) is denied. A `Read`, `Edit`, `MultiEdit`, `Grep` or `Bash` call that
touches a secret file is denied as described under [How it works](../README.md#how-it-works), and so is a
`Bash` command that names a file inside an unapproved skill. Names that resolve to no skill
directory, such as built-in commands, pass. The Skill and prompt checks fail closed; the other checks fail open with a warning
on stderr. A call takes a little over 100 ms on typical skills, and the `Bash` matcher adds that
to every shell command.

## All agents (user level)

With a global install, `skill-guard setup` prints what it would change and
`skill-guard setup --apply` does it:

- adds the two hooks above to `~/.claude/settings.json`, or widens the matcher of a hook an
  earlier version added;
- adds the same hook to `~/.codex/hooks.json` with the matcher `Bash`, plus a UserPromptSubmit hook
  for `$name` mentions;
- writes `~/.config/opencode/plugins/skill-guard.ts`, which re-exports the OpenCode plugin;
- writes `~/.pi/agent/extensions/skill-guard.ts`, which re-exports the Pi extension.

Each settings file it changes is backed up first with the suffix `.bak-skill-guard`. The user-level
gate covers every project, including projects Pi has not yet trusted. Re-run it after upgrading
the package. Start a new session of each agent afterwards. Codex runs a new or changed hook only
after you trust it with `/hooks`.

## Codex hook (project)

Codex reads hooks from `.codex/hooks.json` in a trusted project, in the same format as Claude
Code. It sends shell commands as `Bash` and has no separate read tool, so the shell check is what
keeps an unapproved `SKILL.md` and secret files out of its context:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$(git rev-parse --show-toplevel)/node_modules/skill-guard/dist/claudeGate.js\"",
            "timeout": 10
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$(git rev-parse --show-toplevel)/node_modules/skill-guard/dist/claudeGate.js\"",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

Codex finds skills in `.agents/skills` and `~/.agents/skills`, which skill-guard already scans,
plus `~/.codex/skills` for older installs.

## OpenCode plugin (project)

Create `.opencode/plugins/skill-guard.ts`:

```ts
export { SkillGuardPlugin } from "../../node_modules/skill-guard/dist/opencodePlugin.js";
```

The plugin's `tool.execute.before` handler throws, which cancels the call, when the `skill` tool
names an unapproved skill, when `read` or `grep` targets a file inside one, or when `read`, `edit`,
`grep` or the shell tool touches a secret file. It accepts both the `filePath` and the `path`
argument names, and both `bash` and `shell` as the shell tool. OpenCode finds skills in
`.opencode/skills`, `.claude/skills` and `.agents/skills` and their `~/.config/opencode`,
`~/.claude` and `~/.agents` counterparts, all of which skill-guard scans.

## Pi extension (project)

Create `.pi/extensions/skill-guard.ts`:

```ts
export { default } from "../../node_modules/skill-guard/dist/piExtension.js";
```

The `input` handler runs before `/skill:name` expansion and answers `{ action: "handled" }` with
an error notification when the skill is not approved. The `tool_call` handler blocks `read` of
files inside a skill directory, and `read`, `edit`, `grep` and `bash` calls that touch a secret
file. The project root is the nearest ancestor with a `.git` directory.
A project extension loads only after Pi has trusted the project.

## Pre-commit hook

```sh
#!/usr/bin/env bash
set -euo pipefail

node node_modules/skill-guard/bin/skill-guard.js scan --staged || {
  echo "pre-commit: unaccepted HIGH findings in staged skill or agent files (see above)." >&2
  echo "  Fix them, or accept a reviewed finding with: skill-guard accept <skill> <rule> <file>" >&2
  exit 1
}
```

`--staged` reads the staged blobs, not the working tree, and covers `.agents/skills`,
`.claude/skills`, `.pi`, `AGENTS.md`, `CLAUDE.md`, `.claude/agents`, `.claude/commands`,
`.claude/hooks` and `.claude/settings.json`.
