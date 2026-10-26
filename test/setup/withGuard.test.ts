import { assert, describe, it } from '@effect/vitest';

import { GUARD_TOOL_MATCHER } from '../../src/setup/constants/SetupPaths.ts';
import type { ClaudeSettings } from '../../src/setup/schemas/ClaudeSettings.ts';
import { withGuard } from '../../src/setup/utils/withGuard.ts';

const GATE = 'node "/usr/lib/node_modules/skill-guard/dist/claudeGate.js"';

const guardHooks = [{ type: 'command', command: GATE, timeout: 10 }];

describe('withGuard', () => {
  it('adds the tool and prompt hooks to empty settings', () => {
    assert.deepStrictEqual<ClaudeSettings>(withGuard({}, GATE, GUARD_TOOL_MATCHER), {
      hooks: {
        PreToolUse: [{ matcher: GUARD_TOOL_MATCHER, hooks: guardHooks }],
        UserPromptSubmit: [{ hooks: guardHooks }],
      },
    });
  });

  it('widens the matcher of an existing guard without duplicating it', () => {
    const otherGroup = { matcher: 'Write', hooks: [{ type: 'command', command: 'lint' }] };
    const settings = {
      model: 'opus',
      hooks: {
        PreToolUse: [otherGroup, { matcher: 'Skill|Read', hooks: guardHooks }],
        UserPromptSubmit: [{ hooks: guardHooks }],
      },
    };
    assert.deepStrictEqual<ClaudeSettings>(withGuard(settings, GATE, GUARD_TOOL_MATCHER), {
      model: 'opus',
      hooks: {
        PreToolUse: [otherGroup, { matcher: GUARD_TOOL_MATCHER, hooks: guardHooks }],
        UserPromptSubmit: [{ hooks: guardHooks }],
      },
    });
  });

  it('leaves settings that already have the current guard unchanged', () => {
    const settings = withGuard({}, GATE, GUARD_TOOL_MATCHER);
    assert.deepStrictEqual<ClaudeSettings>(withGuard(settings, GATE, GUARD_TOOL_MATCHER), settings);
  });
});
