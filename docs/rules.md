# Rules

Severity by file kind: prose / code / config. A dash means the rule does not apply to that kind.

Every line is matched as written and again after folding: NFKC normalization, invisible characters
removed, and Cyrillic and Greek lookalikes mapped to Latin letters. `hidden-unicode` and
`mixed-script` look only at the line as written.

## Prompt injection

| Rule                    | Severity               | Catches                                                                                                                                                                                                                     |
| ----------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hidden-unicode`        | HIGH / HIGH / HIGH     | zero-width, bidi, invisible and Unicode-tag characters; a ZWJ inside an emoji sequence is allowed                                                                                                                           |
| `hijack-phrase`         | HIGH / HIGH / HIGH     | "ignore / disregard previous instructions or guidance", "you are now", "do not tell the user", "keep this private from", "silently run", "bypass safety", "this skill takes priority over", "new system prompt" and similar |
| `role-spoofing`         | HIGH / HIGH / HIGH     | chat-template tokens (`<\|im_start\|>`, `[INST]`, `<<SYS>>`) and fake `<system>` or `</system-reminder>` tags                                                                                                               |
| `chat-turn-label`       | MEDIUM / - / -         | a line that starts with `Human:`, `Assistant:` or `System:`                                                                                                                                                                 |
| `mixed-script`          | HIGH / MEDIUM / MEDIUM | a word that mixes Latin letters with Cyrillic or Latin-lookalike Greek letters                                                                                                                                              |
| `description-directive` | MEDIUM / - / -         | a frontmatter `description:` with standing orders such as "always run", "before any task", "regardless of"                                                                                                                  |
| `html-comment`          | MEDIUM / - / -         | `<!-- -->` in Markdown, hidden from the rendered page                                                                                                                                                                       |

## Malicious execution

| Rule                  | Severity                 | Catches                                                                                                                                  |
| --------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `pipe-to-shell`       | HIGH / HIGH / HIGH       | `\| sh`, `\| bash`, `\| python`, `bash <(curl ...)`, `sh -c "$(curl ...)"`, `iwr ... \| iex`                                             |
| `download-execute`    | HIGH / HIGH / HIGH       | a download followed by running it: `curl -o x ... && sh x`, `&& chmod +x`, `&& ./x`                                                      |
| `download-command`    | MEDIUM / MEDIUM / MEDIUM | `curl`, `wget`, `Invoke-WebRequest`                                                                                                      |
| `package-runner`      | MEDIUM / MEDIUM / MEDIUM | `npx`, `bunx`, `pnpm dlx`, `uvx`, `pipx run`, global `npm install`, `pip install`, `brew install`                                        |
| `inline-network-code` | HIGH / HIGH / HIGH       | `python -c`, `node -e`, `perl -e` one-liners that open URLs or sockets                                                                   |
| `inline-code`         | MEDIUM / LOW / MEDIUM    | any `python -c`, `node -e`, `perl -e`, `ruby -e`, `php -r` one-liner                                                                     |
| `decode-payload`      | MEDIUM / MEDIUM / MEDIUM | `base64 -d`, `b64decode(`, `atob(`, `Buffer.from(..., "base64")`, `xxd -r`                                                               |
| `process-exec`        | - / MEDIUM / -           | `child_process`, `execSync`, `spawn(`, `subprocess.`, `os.system`                                                                        |
| `dynamic-eval`        | - / HIGH / -             | `eval(`, `new Function(`, `vm.run`, `exec(compile(`                                                                                      |
| `dynamic-module-load` | MEDIUM / HIGH / -        | `exec_module`, `spec_from_file_location`, `importlib.machinery`, `runpy`                                                                 |
| `dynamic-import`      | - / MEDIUM / -           | `importlib.import_module(`, `__import__(`, `import(` or `require(` with a non-literal argument                                           |
| `prompt-automation`   | HIGH / HIGH / HIGH       | `osascript`, System Events, Accessibility actions, `tccutil`, `xdotool`, `AutoHotkey`: clicking through OS or browser permission prompts |

## Data exfiltration

| Rule                   | Severity                 | Catches                                                                                                                                                                                                                                                               |
| ---------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `secret-path`          | MEDIUM / HIGH / LOW      | `.env`, `~/.ssh`, private keys, `~/.aws`, `.netrc`, `.npmrc`, `.pypirc`, `.git-credentials`, `~/.config/gh`, `.kube/config`, `/etc/passwd`, shell history, browser login stores, keychain access, `printenv`, environment dumps such as `JSON.stringify(process.env)` |
| `secret-token`         | LOW / MEDIUM / LOW       | mentions of API keys, access tokens, bearer tokens and similar                                                                                                                                                                                                        |
| `exfil-command`        | HIGH / HIGH / HIGH       | `nc host port`, `/dev/tcp/`, `curl -d @file`, `curl -F x=@file`, `wget --post-file`, `curl ... $(cat ...)`                                                                                                                                                            |
| `remote-copy`          | MEDIUM / MEDIUM / MEDIUM | `scp` or `rsync` to or from `host:path`                                                                                                                                                                                                                               |
| `exfil-host`           | HIGH / HIGH / HIGH       | request collectors and paste sites: `webhook.site`, RequestBin, Pipedream, interactsh / OAST, Burp Collaborator, Pastebin, `transfer.sh`, Discord and Slack webhooks, Telegram bot API                                                                                |
| `markdown-image-exfil` | HIGH / MEDIUM / MEDIUM   | an image or `<img>` URL with a placeholder in its query (`?d={SECRET}`), or text telling the agent to put secrets or the conversation into a URL                                                                                                                      |
| `network-call`         | - / MEDIUM / -           | `fetch(`, `http.request(`, `axios`, `requests.get`, `urllib`, sockets, `WebSocket`                                                                                                                                                                                    |

## System and agent tampering

| Rule                  | Severity                 | Catches                                                                                                                                                                                                                                |
| --------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `settings-tampering`  | HIGH / HIGH / MEDIUM     | `--dangerously*`, `--yolo`, `bypassPermissions`, `approval_policy = never`, `danger-full-access`, or text telling the agent to edit Claude Code, Codex, OpenCode or Pi settings, hooks, `CLAUDE.md`, `AGENTS.md` or the trust registry |
| `persistence`         | HIGH / HIGH / HIGH       | appending to `~/.zshrc` and other shell profiles, `crontab` (except `-l`), LaunchAgents, `launchctl load`, `systemctl enable`, `/etc/cron`, `schtasks /create`, the Windows `Run` key                                                  |
| `destructive-command` | HIGH / HIGH / HIGH       | `rm -rf /`, `~` or `$HOME`, `mkfs`, `dd of=/dev/disk`, a fork bomb, `chmod -R 777 /`, force-push to `main`, `shred`                                                                                                                    |
| `security-weakening`  | MEDIUM / MEDIUM / MEDIUM | `NODE_TLS_REJECT_UNAUTHORIZED=0`, `verify=False`, `curl -k`, `--no-verify`, `core.hooksPath`, `chmod 777`, clearing shell history, disabling Gatekeeper, SIP, SELinux or the firewall                                                  |
| `fs-write-outside`    | - / HIGH / -             | file writes, renames or deletes aimed at `/`, `~`, `$HOME` or `../`                                                                                                                                                                    |
| `fs-write`            | - / MEDIUM / -           | file writes, moves and deletes in general                                                                                                                                                                                              |

## Supply chain and obfuscation

| Rule                      | Severity                 | Catches                                                                                                                                                              |
| ------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `remote-instructions`     | HIGH / MEDIUM / MEDIUM   | "read / follow / fetch" pointing at a raw GitHub, Gist or `blob` URL                                                                                                 |
| `remote-instruction-link` | MEDIUM / - / -           | a link to a remote Markdown document                                                                                                                                 |
| `install-hook`            | - / MEDIUM / HIGH        | `preinstall`, `install`, `postinstall` and uninstall scripts in `package.json`; `cmdclass` in Python packaging                                                       |
| `unpinned-remote`         | MEDIUM / MEDIUM / MEDIUM | raw GitHub URLs on `main`, `master` or `HEAD`, `npx pkg@latest`, `pip install git+https://...` without a ref, `github:owner/repo` without `#ref`                     |
| `opaque-url`              | MEDIUM / MEDIUM / MEDIUM | URLs to a public IP address, a link shortener, or a tunnel (ngrok, `trycloudflare.com`, `loca.lt`)                                                                   |
| `external-url`            | LOW                      | any URL whose host is not on the documentation allowlist (Anthropic, MDN, Node, TypeScript, W3C, schema.org, a few framework docs sites, `example.com`, `localhost`) |
| `symlink-escape`          | HIGH                     | a symlink whose target is outside the project (project skills) or outside the skill (user and plugin skills)                                                         |
| `base64-blob`             | MEDIUM / MEDIUM / MEDIUM | 200 or more base64 characters in a row                                                                                                                               |
| `hex-blob`                | MEDIUM / MEDIUM / MEDIUM | 128 or more hex characters in a row                                                                                                                                  |
| `data-uri`                | MEDIUM / LOW / MEDIUM    | inline `data:...;base64,`                                                                                                                                            |
| `oversized-file`          | MEDIUM                   | a file over 512 KB                                                                                                                                                   |
| `binary-file`             | MEDIUM, LOW for media    | a file with NUL bytes; images, fonts and PDFs are LOW                                                                                                                |

Excerpts are masked: control and invisible characters are shown as `\u{...}` escapes, and any run
of 24 or more token-like characters is shortened to its first four characters and its length, so a
scan never prints a secret.
