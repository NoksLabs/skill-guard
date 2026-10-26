# Rules

Severity by file kind: prose / code / config. A dash means the rule does not apply to that kind.

| Rule                      | Severity                 | Catches                                                                                                                                                              |
| ------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hidden-unicode`          | HIGH / HIGH / HIGH       | zero-width, bidi, invisible and Unicode-tag characters; a ZWJ inside an emoji sequence is allowed                                                                    |
| `hijack-phrase`           | HIGH / HIGH / HIGH       | "ignore previous instructions", "you are now", "do not tell the user", "bypass safety", "new system prompt" and similar                                              |
| `settings-tampering`      | HIGH / HIGH / MEDIUM     | `--dangerously*`, `bypassPermissions`, or text telling the agent to edit `settings.json`, `.claude/`, `CLAUDE.md`, `AGENTS.md`, `.pi/`, hooks or permission modes    |
| `secret-path`             | MEDIUM / HIGH / LOW      | `.env`, `~/.ssh`, `id_rsa`, `~/.aws`, `~/.alchemy`, keychain access, `printenv`, `env \|`                                                                            |
| `secret-token`            | LOW / MEDIUM / LOW       | mentions of API keys, access tokens, bearer tokens and similar                                                                                                       |
| `pipe-to-shell`           | HIGH / HIGH / HIGH       | `\| sh`, `\| bash`, `\| node`, `\| python`, ...                                                                                                                      |
| `download-command`        | MEDIUM / MEDIUM / MEDIUM | `curl`, `wget`, `Invoke-WebRequest`                                                                                                                                  |
| `package-runner`          | MEDIUM / MEDIUM / MEDIUM | `npx`, `bunx`, `pnpm dlx`, `uvx`, `pipx run`, global `npm install`, `pip install`, `brew install`                                                                    |
| `process-exec`            | - / MEDIUM / -           | `child_process`, `execSync`, `spawn(`, `subprocess.`, `os.system`                                                                                                    |
| `dynamic-eval`            | - / HIGH / -             | `eval(`, `new Function(`, `vm.run`, `exec(compile(`                                                                                                                  |
| `network-call`            | - / MEDIUM / -           | `fetch(`, `http.request(`, `axios`, `requests.get`, `urllib`, sockets, `WebSocket`                                                                                   |
| `fs-write-outside`        | - / HIGH / -             | file writes, renames or deletes aimed at `/`, `~`, `$HOME` or `../`                                                                                                  |
| `dynamic-module-load`     | MEDIUM / HIGH / -        | `exec_module`, `spec_from_file_location`, `importlib.machinery`, `runpy`                                                                                             |
| `dynamic-import`          | - / MEDIUM / -           | `importlib.import_module(`, `__import__(`, `import(` or `require(` with a non-literal argument                                                                       |
| `fs-write`                | - / MEDIUM / -           | file writes, moves and deletes in general                                                                                                                            |
| `prompt-automation`       | HIGH / HIGH / HIGH       | `osascript`, System Events, Accessibility actions, `tccutil`, `xdotool`, `AutoHotkey`: clicking through OS or browser permission prompts                             |
| `remote-instructions`     | HIGH / MEDIUM / MEDIUM   | "read / follow / fetch" pointing at a raw GitHub, Gist or `blob` URL                                                                                                 |
| `remote-instruction-link` | MEDIUM / - / -           | a link to a remote Markdown document                                                                                                                                 |
| `html-comment`            | MEDIUM / - / -           | `<!-- -->` in Markdown, hidden from the rendered page                                                                                                                |
| `base64-blob`             | MEDIUM / MEDIUM / MEDIUM | 200 or more base64 characters in a row                                                                                                                               |
| `hex-blob`                | MEDIUM / MEDIUM / MEDIUM | 128 or more hex characters in a row                                                                                                                                  |
| `data-uri`                | MEDIUM / LOW / MEDIUM    | inline `data:...;base64,`                                                                                                                                            |
| `external-url`            | LOW                      | any URL whose host is not on the documentation allowlist (Anthropic, MDN, Node, TypeScript, W3C, schema.org, a few framework docs sites, `example.com`, `localhost`) |
| `symlink-escape`          | HIGH                     | a symlink whose target is outside the project (project skills) or outside the skill (user and plugin skills)                                                         |
| `oversized-file`          | MEDIUM                   | a file over 512 KB                                                                                                                                                   |
| `binary-file`             | MEDIUM, LOW for media    | a file with NUL bytes; images, fonts and PDFs are LOW                                                                                                                |

Excerpts are masked: control and invisible characters are shown as `\u{...}` escapes, and any run
of 24 or more token-like characters is shortened to its first four characters and its length, so a
scan never prints a secret.
