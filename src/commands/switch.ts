import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parse, stringify } from 'yaml';
import { configSchema, flowNameSchema, type FlowConfig } from '../schemas/config.js';

export type SwitchCommandOptions = {
  root?: string;
  strategy?: string;
};

export type SwitchResult = {
  previous: FlowConfig['flow']['current'];
  current: FlowConfig['flow']['current'];
  changed: boolean;
};

const SUPPORTED_STRATEGIES = flowNameSchema.options;

/**
 * 切换当前 flow strategy。
 *
 * Plan 8 只负责更新 `.flow/config.yaml` 的 `flow.current`。不同 flow 的启动规则、
 * prompt 结构和状态机行为会在后续 strategy 层里扩展。
 */
export async function switchFlow(options: SwitchCommandOptions = {}): Promise<SwitchResult> {
  const root = resolve(options.root ?? process.cwd());
  const strategy = parseStrategy(options.strategy);
  const config = await readConfig(root);
  const previous = config.flow.current;
  const updatedConfig: FlowConfig = {
    ...config,
    flow: {
      ...config.flow,
      current: strategy,
    },
  };

  await writeConfig(root, updatedConfig);

  return {
    previous,
    current: strategy,
    changed: previous !== strategy,
  };
}

export async function switchCommand(options: SwitchCommandOptions = {}): Promise<string[]> {
  const result = await switchFlow(options);
  return formatSwitchResult(result);
}

export function formatSwitchResult(result: SwitchResult): string[] {
  const summary = result.changed
    ? `Flow switched: ${result.previous} -> ${result.current}`
    : `Flow unchanged: ${result.current}`;

  return [summary, 'Updated .flow/config.yaml'];
}

async function readConfig(root: string): Promise<FlowConfig> {
  const raw = await readFile(configPath(root), 'utf8');
  return configSchema.parse(parse(raw));
}

async function writeConfig(root: string, config: FlowConfig): Promise<void> {
  await writeFile(configPath(root), stringify(config), 'utf8');
}

function configPath(root: string): string {
  return join(root, '.flow', 'config.yaml');
}

function parseStrategy(strategy: string | undefined): FlowConfig['flow']['current'] {
  if (!strategy || strategy.trim().length === 0) {
    throw new Error(`Flow strategy is required. Supported strategies: ${formatStrategies()}.`);
  }

  const normalized = strategy.trim();
  const parsed = flowNameSchema.safeParse(normalized);

  if (!parsed.success) {
    throw new Error(`Unsupported flow strategy: ${normalized}. Supported strategies: ${formatStrategies()}.`);
  }

  return parsed.data;
}

function formatStrategies(): string {
  return SUPPORTED_STRATEGIES.join(', ');
}
