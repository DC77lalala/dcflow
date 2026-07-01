import { type FlowConfig } from '../schemas/config.js';

export type FlowStrategyRules = {
  name: FlowConfig['flow']['current'];
  title: string;
  rules: string[];
};

const FLOW_STRATEGY_RULES: Record<FlowConfig['flow']['current'], FlowStrategyRules> = {
  harness: {
    name: 'harness',
    title: 'Harness',
    rules: [
      'Blueprint: read and preserve the project architecture intent before editing.',
      'Spec: follow the project rule pool before choosing implementation style.',
      'Task State: work only on the active task unless the user explicitly changes scope.',
      'Quality Gate: run configured checks before claiming completion.',
      'Finish: capture reusable lessons so the flow can improve after the task.',
    ],
  },
  loop: {
    name: 'loop',
    title: 'Loop',
    rules: [
      'Observe: inspect current state, evidence, and constraints before acting.',
      'Plan: choose the smallest next loop step and state the expected outcome.',
      'Act: make focused changes only for the active task.',
      'Verify: run configured checks and compare the result with the plan.',
      'Reflect: record what changed, what failed, and what the next loop should do.',
    ],
  },
};

/**
 * 返回当前 flow 的工作规则。
 *
 * `configSchema` 已经保证 flow 名称合法；这里保留独立映射，是为了后续新增 strategy
 * 时不用把规则硬编码在 `start` 命令里。
 */
export function getFlowStrategyRules(flowName: FlowConfig['flow']['current']): FlowStrategyRules {
  return FLOW_STRATEGY_RULES[flowName];
}
