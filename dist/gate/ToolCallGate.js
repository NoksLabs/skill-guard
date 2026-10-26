import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Path from 'effect/Path';

import { Environment } from '../shared/Environment.js';
                                                                     
import { SecretGate } from './SecretGate.js';
import { SkillGate } from './SkillGate.js';
                                                              
import { commandPathTokens } from './utils/commandPathTokens.js';
import { dollarSkillNames } from './utils/dollarSkillNames.js';
import { expandHome } from './utils/expandHome.js';
import { slashSkillName } from './utils/slashSkillName.js';

const ALLOWED                = { allowed: true };

const NO_SKILL_NAME                = {
  allowed: false,
  reason: 'skill-guard could not read the skill name from the Skill tool call.',
};

export class ToolCallGate extends Context.Service              ()('skill-guard/gate/ToolCallGate', {
  make: Effect.gen(function* () {
    const path = yield* Path.Path;
    const env = yield* Environment;
    const skills = yield* SkillGate;
    const secrets = yield* SecretGate;

    const checkReads = Effect.fn('ToolCallGate.checkReads')(function* (
      projectDir        ,
      cwd        ,
      paths                       ,
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
      projectDir        ,
      names                       ,
    ) {
      const decisions = yield* Effect.forEach(names, (name) =>
        skills.checkInvocation(projectDir, name),
      );
      return decisions.find((decision) => !decision.allowed) ?? ALLOWED;
    });

    const checkPrompt = (projectDir        , prompt        , slashPrefix        ) =>
      checkInvocations(projectDir, [
        ...[slashSkillName(prompt, slashPrefix)].filter((name) => name !== undefined),
        ...dollarSkillNames(prompt),
      ]);

    const checkCall = Effect.fn('ToolCallGate.checkCall')(function* (
      projectDir        ,
      cwd        ,
      call               ,
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
  static          Layer = Layer.effect(this)(this.make).pipe(
    Layer.provideMerge(Layer.mergeAll(SkillGate.Layer, SecretGate.Layer, Environment.Layer)),
  );
}
