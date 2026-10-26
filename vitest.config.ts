import { mergeConfig, type ViteUserConfig } from 'vitest/config';

import shared from './tooling/vitest/vitest.shared.ts';

const config: ViteUserConfig = {};

export default mergeConfig(shared, config);
