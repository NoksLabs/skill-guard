import * as path from 'node:path';

import type { ViteUserConfig } from 'vitest/config';

const config: ViteUserConfig = {
  test: {
    setupFiles: [path.join(import.meta.dirname, 'vitest.setup.ts')],
    sequence: {
      concurrent: true,
    },
    include: ['**/test/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
};

export default config;
