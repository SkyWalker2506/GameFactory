/**
 * @license
 * Copyright 2026 GameFactory
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Config } from '../../config/config.js';
import type {
  ContentGenerator,
  ContentGeneratorConfig,
} from '../contentGenerator.js';
import { CliContentGenerator } from './cliContentGenerator.js';

export function createCliContentGenerator(
  config: ContentGeneratorConfig,
  gcConfig: Config,
): ContentGenerator {
  return new CliContentGenerator(config, gcConfig);
}

export { CliContentGenerator };
