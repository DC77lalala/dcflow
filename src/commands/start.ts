import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import { getFlowStrategyRules, type FlowStrategyRules } from '../core/flowStrategies.js';
import { validateFlowFiles } from '../core/schemaValidator.js';
import { readTasksFile } from '../core/taskStore.js';
import { checksFileSchema, type FlowCheck } from '../schemas/checks.js';
import { configSchema } from '../schemas/config.js';
import { type FlowTask } from '../schemas/tasks.js';
import { getTemplates, type StartLabels, type TemplateLanguage } from '../templates/index.js';

export type StartCommandOptions = {
  root?: string;
};

export type StartWorkPacket = {
  projectName: string;
  flowName: string;
  language: TemplateLanguage;
  labels: StartLabels;
  activeTask: FlowTask;
  flowRules: FlowStrategyRules;
  checks: FlowCheck[];
  handoff: string;
  validationOk: boolean;
  validationErrors: string[];
};

/**
 * 读取当前 active 任务并组装 AI 工作包数据。
 *
 * `start` 只读 `.flow`，不改变任务状态；它的职责是把当前会话需要的上下文
 * 压缩成高信噪比文本，方便复制给 Claude/Codex/Cursor。
 */
export async function getStartWorkPacket(
  options: StartCommandOptions = {},
): Promise<StartWorkPacket> {
  const root = resolve(options.root ?? process.cwd());
  const config = await readConfig(root);
  const tasksFile = await readTasksFile(root);
  const checksFile = await readChecks(root);
  const handoff = await readHandoff(root);
  const validation = await validateFlowFiles(root);
  const activeTask = tasksFile.tasks.find((task) => task.status === 'active');

  if (!activeTask) {
    throw new Error('No active task found. Run `dcflow task active <task-id>` first.');
  }

  return {
    projectName: config.project.name,
    flowName: config.flow.current,
    language: config.language,
    labels: getTemplates(config.language).start,
    activeTask,
    flowRules: getFlowStrategyRules(config.flow.current, config.language),
    checks: checksFile.checks,
    handoff,
    validationOk: validation.ok,
    validationErrors: validation.errors,
  };
}

export async function startCommand(options: StartCommandOptions = {}): Promise<string[]> {
  const packet = await getStartWorkPacket(options);

  return [
    packet.labels.title,
    '',
    `${packet.labels.project}: ${packet.projectName}`,
    `Flow: ${packet.flowName}`,
    `${packet.labels.validation}: ${packet.validationOk ? 'ok' : 'failed'}`,
    ...formatValidationErrors(packet.validationErrors, packet.labels),
    '',
    packet.labels.activeTask,
    `- id: ${packet.activeTask.id}`,
    `- ${packet.labels.taskTitle}: ${packet.activeTask.title}`,
    `- ${packet.labels.taskStatus}: ${packet.activeTask.status}`,
    `- ${packet.labels.taskPriority}: ${packet.activeTask.priority}`,
    ...formatOptionalTaskSection(packet.labels.verification, packet.activeTask.verification, packet.labels),
    ...formatOptionalTaskSection(packet.labels.evidence, packet.activeTask.evidence, packet.labels),
    ...formatTaskNotes(packet.activeTask.notes, packet.labels),
    '',
    `## Flow Rules: ${packet.flowRules.title}`,
    ...formatFlowRules(packet.flowRules.rules),
    '',
    packet.labels.checks,
    ...formatChecks(packet.checks, packet.labels),
    '',
    packet.labels.handoff,
    ...formatHandoff(packet.handoff, packet.flowName, packet.labels),
  ];
}

async function readConfig(root: string) {
  const raw = await readFile(join(root, '.flow', 'config.yaml'), 'utf8');
  return configSchema.parse(parse(raw));
}

async function readChecks(root: string) {
  const raw = await readFile(join(root, '.flow', 'checks', 'default.yaml'), 'utf8');
  return checksFileSchema.parse(parse(raw));
}

async function readHandoff(root: string): Promise<string> {
  return readFile(join(root, '.flow', 'state', 'handoff.md'), 'utf8');
}

function formatValidationErrors(errors: string[], labels: StartLabels): string[] {
  if (errors.length === 0) {
    return [];
  }

  return [labels.validationErrors, ...errors.map((error) => `- ${error}`)];
}

function formatOptionalTaskSection(label: string, values: string[], labels: StartLabels): string[] {
  if (values.length === 0) {
    return [`- ${label}: ${labels.none}`];
  }

  return [`- ${label}:`, ...values.map((value) => `  - ${value}`)];
}

function formatTaskNotes(notes: string | undefined, labels: StartLabels): string[] {
  if (!notes) {
    return [`- ${labels.notes}: ${labels.none}`];
  }

  return [`- ${labels.notes}:`, ...formatBlock(notes, labels)];
}

function formatChecks(checks: FlowCheck[], labels: StartLabels): string[] {
  if (checks.length === 0) {
    return [`- ${labels.none}`];
  }

  return checks.map(
    (check) =>
      `- ${check.name}: ${check.command} (cwd: ${check.cwd}, required: ${check.required})`,
  );
}

function formatFlowRules(rules: string[]): string[] {
  return rules.map((rule) => `- ${rule}`);
}

function formatBlock(value: string, labels: StartLabels): string[] {
  const lines = value.trim().split(/\r?\n/);
  return lines.length === 0 ? [`(${labels.emptyBlock})`] : lines;
}

function formatHandoff(
  value: string,
  flowName: StartWorkPacket['flowName'],
  labels: StartLabels,
): string[] {
  return formatBlock(value, labels).map((line) =>
    normalizeHandoffFlowLine(line, flowName),
  );
}

function normalizeHandoffFlowLine(line: string, flowName: StartWorkPacket['flowName']): string {
  if (line.startsWith('Current flow:')) {
    return `Current flow: ${flowName}`;
  }

  if (line.startsWith('当前 flow:')) {
    return `当前 flow: ${flowName}`;
  }

  return line;
}
