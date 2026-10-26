import * as NodeServices from '@effect/platform-node/NodeServices';
import { assert, describe, layer } from '@effect/vitest';
import * as ConfigProvider from 'effect/ConfigProvider';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Layer from 'effect/Layer';
import * as Path from 'effect/Path';

import { ToolCallGate } from '../../src/gate/ToolCallGate.ts';
import type { AgentToolCall } from '../../src/gate/types/AgentToolCall.ts';
import type { GateError } from '../../src/gate/types/GateError.ts';
import type { TrustDecision } from '../../src/trust/types/TrustDecision.ts';

const SKILL = '---\nname: demo\ndescription: Demo skill.\n---\n\nDo the thing.\n';

const fixture = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* fs.makeTempDirectoryScoped();
  const home = path.join(root, 'home');
  const project = path.join(root, 'project');
  const skillFiles = [
    path.join(project, '.agents', 'skills', 'evil', 'SKILL.md'),
    path.join(project, '.opencode', 'skills', 'oc', 'SKILL.md'),
    path.join(home, '.codex', 'skills', 'codexy', 'SKILL.md'),
  ];
  yield* fs.makeDirectory(path.join(project, '.git'), { recursive: true });
  yield* Effect.forEach(skillFiles, (file) =>
    fs
      .makeDirectory(path.dirname(file), { recursive: true })
      .pipe(Effect.andThen(fs.writeFileString(file, SKILL))),
  );
  return { home, project };
});

const decisionsFor = (
  check: (
    gate: typeof ToolCallGate.Service,
    project: string,
  ) => Effect.Effect<TrustDecision, GateError>,
) =>
  Effect.gen(function* () {
    const { home, project } = yield* fixture;
    const services = yield* Layer.build(
      ToolCallGate.Layer.pipe(
        Layer.provide(ConfigProvider.layer(ConfigProvider.fromEnvRecord({ HOME: home }))),
        Layer.provide(NodeServices.layer),
      ),
    );
    const decision = yield* ToolCallGate.use((gate) => check(gate, project)).pipe(
      Effect.provideContext(services),
    );
    return decision.allowed;
  });

const callAllowed = (call: AgentToolCall) =>
  decisionsFor((gate, project) => gate.checkCall(project, project, call));

const promptAllowed = (prompt: string) =>
  decisionsFor((gate, project) => gate.checkPrompt(project, prompt, '/'));

const shell = (command: string, workdir?: string): AgentToolCall => ({
  kind: 'shell',
  command,
  workdir,
});

describe('ToolCallGate', () => {
  layer(NodeServices.layer)((it) => {
    it.effect.each([
      ['cat of an unapproved skill file', shell('cat .agents/skills/evil/SKILL.md')],
      [
        'a command run inside an unapproved skill',
        shell('sed -n 1,20p SKILL.md', '.agents/skills/evil'),
      ],
      ['cat of a user skill under ~/.codex/skills', shell('cat ~/.codex/skills/codexy/SKILL.md')],
      ['cat of a secret file', shell('cat .env')],
      ['the Skill tool on an unapproved project skill', { kind: 'skill', name: 'evil' }],
      ['the Skill tool on an unapproved OpenCode skill', { kind: 'skill', name: 'oc' }],
      [
        'a read of an unapproved skill file',
        { kind: 'read', paths: ['.opencode/skills/oc/SKILL.md'] },
      ],
      [
        'a search inside an unapproved skill',
        { kind: 'search', paths: ['.agents/skills/evil/SKILL.md'] },
      ],
    ] satisfies ReadonlyArray<readonly [string, AgentToolCall]>)('denies %s', ([, call]) =>
      Effect.gen(function* () {
        assert.isFalse(yield* callAllowed(call));
      }),
    );

    it.effect.each([
      ['a scan of the skill directory', shell('skill-guard scan .agents/skills/evil')],
      ['an ordinary command', shell('cat README.md && git status')],
      ['a name that is not a skill', { kind: 'skill', name: 'does-not-exist' }],
      ['an edit of a skill file', { kind: 'edit', paths: ['.agents/skills/evil/SKILL.md'] }],
      ['a tool the gate does not know', { kind: 'other' }],
    ] satisfies ReadonlyArray<readonly [string, AgentToolCall]>)('allows %s', ([, call]) =>
      Effect.gen(function* () {
        assert.isTrue(yield* callAllowed(call));
      }),
    );

    it.effect.each(['/evil do it', 'please use $evil for this', 'run $codexy then stop'])(
      'denies the prompt %s',
      (prompt) =>
        Effect.gen(function* () {
          assert.isFalse(yield* promptAllowed(prompt));
        }),
    );

    it.effect.each(['echo $HOME', 'cost is $5', '/help', 'plain prompt'])(
      'allows the prompt %s',
      (prompt) =>
        Effect.gen(function* () {
          assert.isTrue(yield* promptAllowed(prompt));
        }),
    );
  });
});
