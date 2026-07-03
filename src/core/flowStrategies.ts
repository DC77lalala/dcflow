import { type FlowConfig } from '../schemas/config.js';
import { getTemplates, type TemplateLanguage } from '../templates/index.js';

export type FlowStrategyRules = {
  name: FlowConfig['flow']['current'];
  title: string;
  rules: string[];
};

/**
 * 返回当前 flow 的工作规则。
 *
 * `configSchema` 已经保证 flow 名称合法；这里保留独立映射，是为了后续新增 strategy
 * 时不用把规则硬编码在 `start` 命令里。
 */
export function getFlowStrategyRules(
  flowName: FlowConfig['flow']['current'],
  language: TemplateLanguage,
): FlowStrategyRules {
  const strategy = getTemplates(language).flowStrategies[flowName];

  return {
    name: flowName,
    title: strategy.title,
    rules: strategy.rules,
  };
}
