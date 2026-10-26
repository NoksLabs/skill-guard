import { assert, describe, it } from '@effect/vitest';

import { claudeToolCall } from '../../src/gate/utils/claudeToolCall.ts';
import { dollarSkillNames } from '../../src/gate/utils/dollarSkillNames.ts';
import { openCodeToolCall } from '../../src/gate/utils/openCodeToolCall.ts';
import { piToolCall } from '../../src/gate/utils/piToolCall.ts';

describe('claudeToolCall', () => {
  it('maps Claude Code and Codex tool names', () => {
    assert.deepStrictEqual(claudeToolCall({ tool_name: 'Skill', tool_input: { skill: 'pdf' } }), {
      kind: 'skill',
      name: 'pdf',
    });
    assert.deepStrictEqual(
      claudeToolCall({ tool_name: 'Grep', tool_input: { path: 'src', glob: '.env*' } }),
      { kind: 'search', paths: ['src', '.env*'] },
    );
    assert.deepStrictEqual(
      claudeToolCall({ tool_name: 'Bash', tool_input: { command: 'cat x', workdir: 'a' } }),
      { kind: 'shell', command: 'cat x', workdir: 'a' },
    );
    assert.deepStrictEqual(claudeToolCall({ tool_name: 'apply_patch', tool_input: {} }), {
      kind: 'other',
    });
  });
});

describe('piToolCall', () => {
  it('maps Pi tool names', () => {
    assert.deepStrictEqual(piToolCall({ toolName: 'read', input: { path: 'a.md' } }), {
      kind: 'read',
      paths: ['a.md'],
    });
    assert.deepStrictEqual(piToolCall({ toolName: 'bash', input: { command: 'ls' } }), {
      kind: 'shell',
      command: 'ls',
      workdir: undefined,
    });
  });
});

describe('openCodeToolCall', () => {
  it('accepts both the filePath and path argument names', () => {
    assert.deepStrictEqual(openCodeToolCall('read', { filePath: '/a/.env' }), {
      kind: 'read',
      paths: ['/a/.env'],
    });
    assert.deepStrictEqual(openCodeToolCall('read', { path: 'b.md' }), {
      kind: 'read',
      paths: ['b.md'],
    });
  });

  it('maps the skill, grep and shell tools', () => {
    assert.deepStrictEqual(openCodeToolCall('skill', { id: 'pdf' }), {
      kind: 'skill',
      name: 'pdf',
    });
    assert.deepStrictEqual(openCodeToolCall('grep', { path: 'src', include: '*.pem' }), {
      kind: 'search',
      paths: ['src', '*.pem'],
    });
    assert.deepStrictEqual(openCodeToolCall('shell', { command: 'cat .env', workdir: 'x' }), {
      kind: 'shell',
      command: 'cat .env',
      workdir: 'x',
    });
  });
});

describe('dollarSkillNames', () => {
  it('finds $name mentions anywhere in a prompt', () => {
    assert.deepStrictEqual(dollarSkillNames('$pdf then use $plugin:review, not a$b'), [
      'pdf',
      'plugin:review',
    ]);
  });
});
