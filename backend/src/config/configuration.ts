import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as yaml from 'js-yaml';

const YAML_CONFIG_FILENAME = 'default.yml';

export default () => yaml.load(
  readFileSync(join(resolve('config'), YAML_CONFIG_FILENAME), 'utf8'),
) as Record<string, any>;
