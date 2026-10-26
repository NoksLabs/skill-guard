import type { ClaudeSettings } from '../schemas/ClaudeSettings.ts';

export const encodeSettings = (settings: ClaudeSettings): string =>
  `${JSON.stringify(settings, null, 2)}\n`;
