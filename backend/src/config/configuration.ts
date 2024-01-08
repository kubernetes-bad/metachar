import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as yaml from 'js-yaml';

const YAML_DEFAULT_CONFIG_FILENAME = 'default.yml';
const YAML_OVERRIDE_CONFIG_FILENAME = 'local.yml';

export default () => {
  const defaults = yaml.load(
    readFileSync(join(resolve('config'), YAML_DEFAULT_CONFIG_FILENAME), 'utf8'),
  ) as Record<string, any>;

  const overrideConfigPath = join(resolve('config'), YAML_OVERRIDE_CONFIG_FILENAME);
  if (!existsSync(overrideConfigPath)) return defaults;

  const overrides = yaml.load(
    readFileSync(overrideConfigPath, 'utf8'),
  ) as Record<string, any>;

  return { ...defaults, ...overrides };
}
