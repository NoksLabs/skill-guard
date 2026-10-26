import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Path from 'effect/Path';

import { Environment } from '../shared/Environment.ts';
import type { TrustDecision } from '../trust/types/TrustDecision.ts';
import { SecretGate } from './SecretGate.ts';
import { SkillGate } from './SkillGate.ts';
import type { AgentToolCall } from './types/AgentToolCall.ts';
import { commandPathTokens } from './utils/commandPathTokens.ts';
import { dollarSkillNames } from './utils/dollarSkillNames.ts';
import { expandHome } from './utils/expandHome.ts';
import { slashSkillName } from './utils/slashSkillName.ts';

const ALLOWED: TrustDecision = { allowed: true };

const NO_SKILL_NAME: TrustDecision = {
  allowed: false,
  reason: 'skill-guard could not read the skill name from the Skill tool call.',
};

export class ToolCallGate extends Context.Service<ToolCallGate>()('skill-guard/gate/ToolCallGate', {
  make: Effect.gen(function* () {
    const path = yield* Path.Path;
    const env = yield* Environment;
    const skills = yield* SkillGate;
    const secrets = yield* SecretGate;

    const checkReads = Effect.fn('ToolCallGate.checkReads')(function* (
      projectDir: string,
      cwd: string,
      paths: ReadonlyArray<string>,
    ) {
      const secretDecision = yield* secrets.checkPaths(cwd, paths);
      return secretDecision.allowed
        ? yield* skills.checkFileReads(
            projectDir,
            cwd,
            paths.map((candidate) => expandHome(candidate, env.home)),
          )
        : secretDecision;
    });

    const checkInvocations = Effect.fn('ToolCallGate.checkInvocations')(function* (
      projectDir: string,
      names: ReadonlyArray<string>,
    ) {
      const decisions = yield* Effect.forEach(names, (name) =>
        skills.checkInvocation(projectDir, name),
      );
      return decisions.find((decision) => !decision.allowed) ?? ALLOWED;
    });

    const checkPrompt = (projectDir: string, prompt: string, slashPrefix: string) =>
      checkInvocations(projectDir, [
        ...[slashSkillName(prompt, slashPrefix)].filter((name) => name !== undefined),
        ...dollarSkillNames(prompt),
      ]);

    const checkCall = Effect.fn('ToolCallGate.checkCall')(function* (
      projectDir: string,
      cwd: string,
      call: AgentToolCall,
    ) {
      switch (call.kind) {
        case 'skill':
          return call.name === undefined
            ? NO_SKILL_NAME
            : yield* skills.checkInvocation(projectDir, call.name.replace(/^\//, ''));
        case 'read':
        case 'search':
          return yield* checkReads(projectDir, cwd, call.paths);
        case 'edit':
          return yield* secrets.checkPaths(cwd, call.paths);
        case 'shell':
          return yield* checkReads(
            projectDir,
            path.resolve(cwd, call.workdir ?? '.'),
            commandPathTokens(call.command),
          );
        default:
          return ALLOWED;
      }
    });

    return { checkCall, checkPrompt, projectRootOf: skills.projectRootOf };
  }),
}) {
  static readonly Layer = Layer.effect(this)(this.make).pipe(
    Layer.provideMerge(Layer.mergeAll(SkillGate.Layer, SecretGate.Layer, Environment.Layer)),
  );
}
