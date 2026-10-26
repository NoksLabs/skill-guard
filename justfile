default:
    @just --list

f:
    npm exec -- oxfmt --check

fw:
    npm exec -- oxfmt --write

l:
    npm exec -- oxlint

lw:
    npm exec -- oxlint --fix

ck:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -x node_modules/.tsrs/tsrs ]; then
      npm exec -- tsrs -p tsconfig.json
      npm exec -- tsrs -p tsconfig.test.json
      npm exec -- tsrs -p tooling/oxlint/tsconfig.json
    else
      echo "tsrs: no Effect-patched build on this platform, checking with tsc" >&2
      npm exec -- tsc -p tsconfig.json
      npm exec -- tsc -p tsconfig.test.json
      npm exec -- tsc -p tooling/oxlint/tsconfig.json
    fi

ckw:
    npm exec -- oxfmt --write && npm exec -- oxlint --fix && just ck

b-ck:
    npm exec -- oxfmt --check && npm exec -- oxlint && just ck

b:
    npm run build

t:
    npm exec -- vitest run

skills-scan *args:
    node bin/skill-guard.js scan {{args}}

skills-approve name *args:
    node bin/skill-guard.js approve {{name}} {{args}}

skills-accept name rule file *args:
    node bin/skill-guard.js accept {{name}} {{rule}} {{file}} {{args}}

skills-block name *args:
    node bin/skill-guard.js block {{name}} {{args}}
