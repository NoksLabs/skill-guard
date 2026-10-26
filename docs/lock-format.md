# Lock format

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
