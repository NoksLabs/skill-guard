# skill-guard

A trust gate for agent skills. It scans skill files with deterministic rules, records a human
approval of the exact content, and blocks Claude Code and Pi from loading a skill that was never
approved, was blocked, or changed since approval.

No dependencies. Node 22.18 or newer.

## Why

Skills are executable instructions. A `SKILL.md` and the scripts next to it tell an agent what to
run, what to read and what to write, with the agent's permissions. Most skills are copied from
GitHub repositories at whatever commit the branch points to today, and they update silently.
That is a supply-chain surface: a single hidden instruction, an invisible Unicode character, a
`curl | sh`, or a request to edit `settings.json` ends up in the agent's context with no review.

skill-guard makes two things true:

- A skill is loaded only if a person approved that exact content. Any change to any file in the
  skill produces a new hash and the skill is blocked until it is reviewed again.
- Review starts from a deterministic scan with severities, so the reviewer looks at the risky
  lines first and the rest of the review is judgment, not grep.

## How it works

**Content hash.** Every skill directory is hashed as sha256 over each file's sorted relative path,
a `\0`, the file bytes and a `\0`. `.DS_Store` is ignored. Symlinks are followed only to read.

**Scan rules.** Each file is classified as prose (Markdown and everything else), code (`.ts`,
`.js`, `.py`, `.sh`, `.rb`, `.go`, `.rs`, `.php`, `.pl`, `.ps1`, `.lua`, ...) or config (`.json`,
`.yaml`, `.toml`, `.ini`). A rule has a severity per file kind, so `fetch(` is MEDIUM in code
and ignored in prose, while an instruction-hijack phrase is HIGH everywhere. Each finding carries
the rule id, severity, `file:line`, a masked excerpt and the sha256 of the file it was found in.

**Trust registry.** A JSON file per project (`.agents/skills-trust.json`) and per user
(`~/.agents/skills-trust.json`). An entry holds the skill's scope, path, source, the directory hash
at approval, a status (`approved`, `pending`, `blocked`) and the accepted findings.

**approve / accept / block.** `approve` refuses while any HIGH finding is not accepted. `accept`
records one finding as reviewed, bound to the rule, the file and that file's hash; if the file
changes, the acceptance no longer applies. `block` keeps a record that the skill must not load.
Only `approve` writes the directory hash.

**Gate at use.** A Claude Code hook (PreToolUse on `Skill` and `Read`, plus UserPromptSubmit for
typed `/name`) and a Pi extension (`input` and `tool_call` events) re-hash the skill and compare
it with the registry before the content reaches the model. Unapproved, changed and blocked skills
are denied with a reason that names the command to run.

## Install

```sh
npm install -g skill-guard          # CLI on your PATH, user-level gate
npm install -D skill-guard          # per project, run with npx or node_modules/.bin
```

## Usage

```text
skill-guard scan [id|path] [--all] [--verbose] [--staged]
skill-guard approve <id> [--source owner/repo@commit] [--user]
skill-guard accept <id> <rule> <file> [--note "why"] [--user]
skill-guard block <id> [--user]
skill-guard setup [--apply]
```

Skill ids:

| Id | Where the skill lives |
|---|---|
| `<name>` | `.agents/skills`, `.claude/skills` or `.pi/skills` in the project |
| `user:<name>` | `~/.claude/skills`, `~/.agents/skills` or `~/.pi/agent/skills` |
| `plugin:<plugin>:<name>` | a Claude Code plugin's `skills/` directory, from `~/.claude/plugins/installed_plugins.json` |
| `file:<path>` | an agent prompt file such as `AGENTS.md` or `.claude/agents/reviewer.md` |

`scan` with no argument scans every skill from all three sources, plus the project's `AGENTS.md`,
`CLAUDE.md`, `.claude/agents`, `.claude/commands`, `.claude/hooks`, `.claude/settings.json` and
`.pi`, and the user's `~/.claude/CLAUDE.md`, `~/.claude/agents`, `~/.claude/commands`,
`~/.pi/agent/AGENTS.md`, `~/.pi/agent/prompts` and `~/.pi/agent/extensions`. It prints skills and
any target with findings; `--all` prints every target and `--verbose` includes LOW findings.
`scan <id>` or `scan <path>` scans one skill or one file tree, including a directory outside the
project such as a freshly cloned skill you have not installed yet. `--staged` scans the blobs
staged in git, for a pre-commit hook.

Each skill line shows a trust state:

| State | Meaning |
|---|---|
| `approved` | registry hash equals the current hash |
| `CHANGED` | approved once, but some file changed since |
| `UNAPPROVED` | no approval on record |
| `BLOCKED` | blocked in the registry |

`scan` exits 1 when any target has an unaccepted HIGH finding, 0 otherwise, 2 on a usage error.
MEDIUM and LOW findings never fail the scan; they are for the reviewer.

`--user` writes the user registry instead of the project one. The gate accepts a user or plugin
skill approved in either registry. A project skill must be approved in the project registry.
Set `SKILL_GUARD_PROJECT_DIR` to run the CLI against a project other than the current directory.

### Reviewing and approving a skill

1. Download the skill at a pinned commit into an empty scratch directory. Never download straight
   into a skills directory the agent can see.

   ```sh
   S=$(mktemp -d) && git clone --no-checkout https://github.com/<owner>/<repo> "$S/src" \
     && git -C "$S/src" checkout <full-commit-sha> -- <path/to/skill>
   ```

2. Scan the scratch copy: `skill-guard scan "$S/src/<path/to/skill>" --verbose`. Do not run
   anything from the skill.
3. Read every file. For each HIGH and MEDIUM finding decide whether it is benign, and note why.
   Check every command, network call and file write, and whether any instruction conflicts with
   your project rules, your permission settings or your interests. A model can do this review,
   as long as it reads the files and does not execute or follow them.
4. Copy the reviewed files, without `.git`, to `.agents/skills/<name>` (project) or
   `~/.agents/skills/<name>` (user), and symlink `.claude/skills/<name>` to it if Claude Code
   should see it.
5. Re-scan the installed copy with `skill-guard scan <name>`; the findings must match step 2.
6. Accept each reviewed HIGH finding, then approve:

   ```sh
   skill-guard accept <name> <rule> <file> --note "<why it is fine>"
   skill-guard approve <name> --source <owner>/<repo>@<sha>
   ```

7. Commit the skill and `.agents/skills-trust.json` together.

Treat an update as a fresh install: pinned commit, scratch directory, scan, review of the diff
against the installed copy, then copy and approve. Until it is re-approved the hash differs and the
gate blocks the skill. To remove a skill, delete it and run `skill-guard block <name>` to keep the
record, or delete its registry entry.

Claude Code plugins update themselves. After an update, `skill-guard scan` lists their
`plugin:<plugin>:<name>` skills as CHANGED; review the diff in the plugin cache and re-approve
each one you use, with `--user` so the approval covers every project.

## Gate setup

### Claude Code hook (project)

Add to the project's `.claude/settings.json` after the first approvals. The hook needs to find
the package; with `npm install -D skill-guard` that is `node_modules/skill-guard`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Skill|Read",
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
(through symlinks too) is denied. Names that resolve to no skill directory, such as built-in
commands, pass. The Skill and prompt checks fail closed; the Read check fails open with a warning
on stderr. A call takes well under 100 ms on typical skills.

### Claude Code hook and Pi extension (user level)

With a global install, `skill-guard setup` prints what it would change and
`skill-guard setup --apply` does it: it adds the two hooks above to `~/.claude/settings.json`
(after backing it up to `settings.json.bak-skill-guard`) and writes
`~/.pi/agent/extensions/skill-guard.ts`, which re-exports the Pi extension. The user-level gate
covers every project, including projects Pi has not yet trusted. Re-run it after upgrading the
package. Start a new Claude Code or Pi session afterwards.

### Pi extension (project)

Create `.pi/extensions/skill-guard.ts`:

```ts
export { default } from '../../node_modules/skill-guard/dist/piExtension.js';
```

The `input` handler runs before `/skill:name` expansion and answers `{ action: "handled" }` with
an error notification when the skill is not approved. The `tool_call` handler blocks `read` of
files inside a skill directory. The project root is the nearest ancestor with a `.git` directory.
A project extension loads only after Pi has trusted the project.

### Pre-commit hook

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

## Registry format

`.agents/skills-trust.json` (project) and `~/.agents/skills-trust.json` (user):

```json
{
  "version": 1,
  "entries": {
    "break-ui": {
      "scope": "project",
      "path": ".agents/skills/break-ui",
      "source": { "repo": "emilkowalski/skills", "commit": "<sha>" },
      "sha256": "<directory hash at approval>",
      "status": "approved",
      "scannedAt": "2026-10-19T16:50:08.008Z",
      "approvedAt": "2026-10-19T16:50:08.014Z",
      "acceptedFindings": [
        {
          "rule": "hijack-phrase",
          "file": "SKILL.md",
          "fileSha256": "<sha256 of SKILL.md>",
          "note": "warns the user about injection, does not perform it",
          "acceptedAt": "2026-10-19T16:50:02.884Z"
        }
      ]
    }
  }
}
```

- `scope` is `project`, `user`, `plugin` or `file`.
- `source` is `null` when unknown. `approve --source owner/repo@sha` sets it; without the flag,
  `approve` looks the repo up in `skills-lock.json` and records the commit as `unpinned`.
- `status` is `approved`, `pending` (has accepted findings but no approval) or `blocked`.
- Entries for `file:<path>` targets only carry accepted findings; their `sha256` stays empty.
- Entries are written sorted by id, so the file diffs cleanly in git.

## Lock format

If the project has a `skills-lock.json` in the format written by the `skills` CLI, `approve`
reads the skill's `source` from it:

```json
{
  "version": 1,
  "skills": {
    "break-ui": {
      "source": "emilkowalski/skills",
      "sourceType": "github",
      "skillPath": "skills/break-ui/SKILL.md",
      "computedHash": "<hash computed by the installer>"
    }
  }
}
```

skill-guard never writes this file, and its own hash is independent of `computedHash`.

## Rules

Severity by file kind: prose / code / config. A dash means the rule does not apply to that kind.

| Rule | Severity | Catches |
|---|---|---|
| `hidden-unicode` | HIGH / HIGH / HIGH | zero-width, bidi, invisible and Unicode-tag characters; a ZWJ inside an emoji sequence is allowed |
| `hijack-phrase` | HIGH / HIGH / HIGH | "ignore previous instructions", "you are now", "do not tell the user", "bypass safety", "new system prompt" and similar |
| `settings-tampering` | HIGH / HIGH / MEDIUM | `--dangerously*`, `bypassPermissions`, or text telling the agent to edit `settings.json`, `.claude/`, `CLAUDE.md`, `AGENTS.md`, `.pi/`, hooks or permission modes |
| `secret-path` | MEDIUM / HIGH / LOW | `.env`, `~/.ssh`, `id_rsa`, `~/.aws`, `~/.alchemy`, keychain access, `printenv`, `env \|` |
| `secret-token` | LOW / MEDIUM / LOW | mentions of API keys, access tokens, bearer tokens and similar |
| `pipe-to-shell` | HIGH / HIGH / HIGH | `\| sh`, `\| bash`, `\| node`, `\| python`, ... |
| `download-command` | MEDIUM / MEDIUM / MEDIUM | `curl`, `wget`, `Invoke-WebRequest` |
| `package-runner` | MEDIUM / MEDIUM / MEDIUM | `npx`, `bunx`, `pnpm dlx`, `uvx`, `pipx run`, global `npm install`, `pip install`, `brew install` |
| `process-exec` | - / MEDIUM / - | `child_process`, `execSync`, `spawn(`, `subprocess.`, `os.system` |
| `dynamic-eval` | - / HIGH / - | `eval(`, `new Function(`, `vm.run`, `exec(compile(` |
| `network-call` | - / MEDIUM / - | `fetch(`, `http.request(`, `axios`, `requests.get`, `urllib`, sockets, `WebSocket` |
| `fs-write-outside` | - / HIGH / - | file writes, renames or deletes aimed at `/`, `~`, `$HOME` or `../` |
| `dynamic-module-load` | MEDIUM / HIGH / - | `exec_module`, `spec_from_file_location`, `importlib.machinery`, `runpy` |
| `dynamic-import` | - / MEDIUM / - | `importlib.import_module(`, `__import__(`, `import(` or `require(` with a non-literal argument |
| `fs-write` | - / MEDIUM / - | file writes, moves and deletes in general |
| `prompt-automation` | HIGH / HIGH / HIGH | `osascript`, System Events, Accessibility actions, `tccutil`, `xdotool`, `AutoHotkey`: clicking through OS or browser permission prompts |
| `remote-instructions` | HIGH / MEDIUM / MEDIUM | "read / follow / fetch" pointing at a raw GitHub, Gist or `blob` URL |
| `remote-instruction-link` | MEDIUM / - / - | a link to a remote Markdown document |
| `html-comment` | MEDIUM / - / - | `<!-- -->` in Markdown, hidden from the rendered page |
| `base64-blob` | MEDIUM / MEDIUM / MEDIUM | 200 or more base64 characters in a row |
| `hex-blob` | MEDIUM / MEDIUM / MEDIUM | 128 or more hex characters in a row |
| `data-uri` | MEDIUM / LOW / MEDIUM | inline `data:...;base64,` |
| `external-url` | LOW | any URL whose host is not on the documentation allowlist (Anthropic, MDN, Node, TypeScript, W3C, schema.org, a few framework docs sites, `example.com`, `localhost`) |
| `symlink-escape` | HIGH | a symlink whose target is outside the project (project skills) or outside the skill (user and plugin skills) |
| `oversized-file` | MEDIUM | a file over 512 KB |
| `binary-file` | MEDIUM, LOW for media | a file with NUL bytes; images, fonts and PDFs are LOW |

Excerpts are masked: control and invisible characters are shown as `\u{...}` escapes, and any run
of 24 or more token-like characters is shortened to its first four characters and its length, so a
scan never prints a secret.

## Limitations

- Skill descriptions from frontmatter are always in the model's context in Claude Code and Pi,
  so an unapproved skill can still steer through its description.
- Claude Code subagents with preloaded skills receive the content without a tool call.
- `cat` or `grep` of a skill file from a shell tool is not gated. Gating the shell would also
  block reviewers.
- `.claude/commands/*.md` and Pi prompt templates are scanned but not gated at use.
- If the same user skill name exists in two user roots with different contents, only one variant
  can be approved under `user:<name>`.
- MCP servers, plugin hooks and plugin agents are out of scope. Plugin skills are covered.
- The rules are deterministic patterns. They surface the obvious; they do not replace reading the
  skill.

## License

MIT, copyright 2026 NoksLabs.
