# Registry format

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
