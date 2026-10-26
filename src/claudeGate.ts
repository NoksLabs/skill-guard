import { readFileSync } from 'node:fs';

import { checkSkillFileRead, checkSkillInvocation, slashSkillName } from './skillGate.ts';
import type { TrustDecision } from './trustRegistry.ts';

type HookInput = {
  readonly hook_event_name?: string;
  readonly cwd?: string;
  readonly tool_name?: string;
  readonly tool_input?: ToolInput;
  readonly prompt?: string;
};

type ToolInput = {
  readonly skill?: string;
  readonly command?: string;
  readonly name?: string;
  readonly file_path?: string;
};

const parsed: HookInput | null = JSON.parse(readFileSync(0, 'utf8'));
const input: HookInput = parsed ?? {};
const cwd = input.cwd ?? process.cwd();
const projectDir = process.env['CLAUDE_PROJECT_DIR'] ?? cwd;

const failClosed =
  input.hook_event_name === 'UserPromptSubmit' ||
  (input.hook_event_name === 'PreToolUse' && input.tool_name === 'Skill');

process.on('uncaughtException', (error) => {
  process.stderr.write(`skill-guard: ${error.message}\n`);
  process.exit(failClosed ? 2 : 0);
});

const decisionFor = (): TrustDecision => {
  if (input.hook_event_name === 'UserPromptSubmit') {
    const name = slashSkillName(input.prompt ?? '', '/');
    return name === undefined ? { allowed: true } : checkSkillInvocation(projectDir, name);
  }
  if (input.hook_event_name === 'PreToolUse' && input.tool_name === 'Skill') {
    const name = input.tool_input?.skill ?? input.tool_input?.command ?? input.tool_input?.name;
    return name === undefined
      ? {
          allowed: false,
          reason: 'skill-guard could not read the skill name from the Skill tool call.',
        }
      : checkSkillInvocation(projectDir, name.replace(/^\//, ''));
  }
  if (input.hook_event_name === 'PreToolUse' && input.tool_name === 'Read') {
    const filePath = input.tool_input?.file_path;
    return filePath === undefined
      ? { allowed: true }
      : checkSkillFileRead(projectDir, cwd, filePath);
  }
  return { allowed: true };
};

const decision = decisionFor();

if (!decision.allowed) {
  process.stdout.write(
    JSON.stringify(
      input.hook_event_name === 'UserPromptSubmit'
        ? { decision: 'block', reason: `skill-guard: ${decision.reason}` }
        : {
            hookSpecificOutput: {
              hookEventName: 'PreToolUse',
              permissionDecision: 'deny',
              permissionDecisionReason: `skill-guard: ${decision.reason}`,
            },
          },
    ),
  );
}
