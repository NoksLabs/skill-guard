import * as Config from 'effect/Config';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

export class Environment extends Context.Service<Environment>()('skill-guard/shared/Environment', {
  make: Effect.gen(function* () {
    const home = yield* Config.String('HOME');
    const projectDirOverride = yield* Config.option(Config.String('SKILL_GUARD_PROJECT_DIR'));
    const claudeProjectDir = yield* Config.option(Config.String('CLAUDE_PROJECT_DIR'));
    const cwd = yield* Effect.sync(() => process.cwd());
    return { home, cwd, projectDirOverride, claudeProjectDir };
  }),
}) {
  static readonly Layer = Layer.effect(this)(this.make);
}
