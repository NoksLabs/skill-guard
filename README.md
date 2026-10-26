# skill-guard

A trust gate for agent skills. It scans skill files with deterministic rules, records a human
approval of the exact content, and blocks Claude Code and Pi from loading a skill that was never
approved, was blocked, or changed since approval.

Built on [Effect](https://effect.website) 4 and its `effect/cli` module. Node 22.18 or newer.

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

`skill-guard` with no subcommand runs `scan` with default flags. `--help` on any command prints
its arguments and flags, and `--completions bash|zsh|fish` prints a shell completion script.

Skill ids:

| Id                       | Where the skill lives                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| `<name>`                 | `.agents/skills`, `.claude/skills` or `.pi/skills` in the project                           |
| `user:<name>`            | `~/.claude/skills`, `~/.agents/skills` or `~/.pi/agent/skills`                              |
| `plugin:<plugin>:<name>` | a Claude Code plugin's `skills/` directory, from `~/.claude/plugins/installed_plugins.json` |
| `file:<path>`            | an agent prompt file such as `AGENTS.md` or `.claude/agents/reviewer.md`                    |

`scan` with no argument scans every skill from all three sources, plus the project's `AGENTS.md`,
`CLAUDE.md`, `.claude/agents`, `.claude/commands`, `.claude/hooks`, `.claude/settings.json` and
`.pi`, and the user's `~/.claude/CLAUDE.md`, `~/.claude/agents`, `~/.claude/commands`,
`~/.pi/agent/AGENTS.md`, `~/.pi/agent/prompts` and `~/.pi/agent/extensions`. It prints skills and
any target with findings; `--all` prints every target and `--verbose` includes LOW findings.
`scan <id>` or `scan <path>` scans one skill or one file tree, including a directory outside the
project such as a freshly cloned skill you have not installed yet. `--staged` scans the blobs
staged in git, for a pre-commit hook.

Each skill line shows a trust state:

| State        | Meaning                                    |
| ------------ | ------------------------------------------ |
| `approved`   | registry hash equals the current hash      |
| `CHANGED`    | approved once, but some file changed since |
| `UNAPPROVED` | no approval on record                      |
| `BLOCKED`    | blocked in the registry                    |

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
on stderr. A call takes a little over 100 ms on typical skills.

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
export { default } from "../../node_modules/skill-guard/dist/piExtension.js";
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

## Reference

- [Rules](docs/rules.md): every rule with its severity per file kind and what it catches.
- [Registry format](docs/registry-format.md): the `skills-trust.json` entry fields.
- [Lock format](docs/lock-format.md): how `approve` reads a skill's source from `skills-lock.json`.

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

## Development

```sh
pnpm install          # also patches oxlint and tsc with the Effect language service
pnpm check-all        # oxfmt --check, oxlint, tsc for src/ and tooling/
pnpm build            # strips types from src/ into dist/ with node:module
just ck               # typecheck with the Effect-patched tsrs when available
```

The source is Effect code with erasable TypeScript syntax only, so the build is a type strip and
`dist/` is committed. Every module is an `Effect` value over the `FileSystem`, `Path`, `Crypto`,
`ChildProcessSpawner` and `Stdio` services, provided by `@effect/platform-node` once at each of the
three entry points (`cli.ts`, `claudeGate.ts`, `piExtension.ts`).

`src/` is split into vertical slices, each with its own `schemas/`, `decoders/`, `encoders/`,
`types/`, `constants/` and `utils/` directories and one `Context.Service` per capability:

```text
src/
  shared/   Environment service, sha256, isoNow, concatBytes
  skill/    SkillFiles (list, read, hash) and SkillLocator (project, user, plugin skills)
  scan/     rules and findings, ContentScanner, ScanTargets, StagedBlobs
  trust/    registry schemas, TrustRegistryStore, decideTrust
  gate/     SkillGate, the Claude Code hook program and the Pi handlers
  setup/    SetupInstaller
  cli/      one file per command, SkillGuardCli
```

Linting is oxlint with the Effect preset from `@effect/tsgo` plus the `anti-slop` and `effect`
plugins under `tooling/oxlint`; formatting is oxfmt. `scripts/pre-commit` runs `skill-guard scan
--staged` and rejects any authored file over 5,000 tokens (20 KB), with advice on how to split it.
`pnpm install` points `core.hooksPath` at `scripts`.

## License

MIT, copyright 2026 NOKSLABS LTD.
