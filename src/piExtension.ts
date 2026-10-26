import { checkSkillFileRead, checkSkillInvocation, slashSkillName } from './skillGate.ts';
import { projectRootOf } from './skillRoots.ts';
import type { TrustDecision } from './trustRegistry.ts';

type GuardContext = {
  readonly cwd: string;
  readonly ui: { readonly notify: (message: string, type?: 'info' | 'warning' | 'error') => void };
};

type InputEvent = { readonly text: string };

type ToolCallEvent = {
  readonly toolName: string;
  readonly input: { readonly path?: string };
};

type GuardApi = {
  readonly on: {
    (
      event: 'input',
      handler: (
        event: InputEvent,
        ctx: GuardContext,
      ) => { readonly action: 'continue' | 'handled' },
    ): void;
    (
      event: 'tool_call',
      handler: (
        event: ToolCallEvent,
        ctx: GuardContext,
      ) => { readonly block: boolean; readonly reason?: string } | undefined,
    ): void;
  };
};

const projectDirOf = (ctx: GuardContext): string => projectRootOf(ctx.cwd);

const denied = (decision: TrustDecision): string | undefined =>
  decision.allowed ? undefined : `skill-guard: ${decision.reason}`;

export default function skillsGuard(pi: GuardApi): void {
  pi.on('input', (event, ctx) => {
    const name = slashSkillName(event.text, '/skill:');
    const reason =
      name === undefined ? undefined : denied(checkSkillInvocation(projectDirOf(ctx), name));
    if (reason === undefined) {
      return { action: 'continue' };
    }
    ctx.ui.notify(reason, 'error');
    return { action: 'handled' };
  });

  pi.on('tool_call', (event, ctx) => {
    const path = event.input.path;
    if (event.toolName !== 'read' || path === undefined) {
      return undefined;
    }
    const reason = denied(checkSkillFileRead(projectDirOf(ctx), ctx.cwd, path));
    return reason === undefined ? undefined : { block: true, reason };
  });
}
