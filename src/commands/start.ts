import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import { getFlowStrategyRules, type FlowStrategyRules } from '../core/flowStrategies.js';
import { validateFlowFiles } from '../core/schemaValidator.js';
import { readTasksFile } from '../core/taskStore.js';
import { checksFileSchema, type FlowCheck } from '../schemas/checks.js';
import { configSchema } from '../schemas/config.js';
import { type FlowTask } from '../schemas/tasks.js';

export type StartCommandOptions = {
  root?: string;
};

export type StartWorkPacket = {
  projectName: string;
  flowName: string;
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
    activeTask,
    flowRules: getFlowStrategyRules(config.flow.current),
    checks: checksFile.checks,
    handoff,
    validationOk: validation.ok,
    validationErrors: validation.errors,
  };
}

export async function startCommand(options: StartCommandOptions = {}): Promise<string[]> {
  const packet = await getStartWorkPacket(options);

  return [
    '# dcflow Work Packet',
    '',
    `Project: ${packet.projectName}`,
    `Flow: ${packet.flowName}`,
    `Validation: ${packet.validationOk ? 'ok' : 'failed'}`,
    ...formatValidationErrors(packet.validationErrors),
    '',
    '## Active Task',
    `- id: ${packet.activeTask.id}`,
    `- title: ${packet.activeTask.title}`,
    `- status: ${packet.activeTask.status}`,
    `- priority: ${packet.activeTask.priority}`,
    ...formatOptionalTaskSection('verification', packet.activeTask.verification),
    ...formatOptionalTaskSection('evidence', packet.activeTask.evidence),
    ...formatTaskNotes(packet.activeTask.notes),
    '',
    `## Flow Rules: ${packet.flowRules.title}`,
    ...formatFlowRules(packet.flowRules.rules),
    '',
    '## Checks',
    ...formatChecks(packet.checks),
    '',
    '## Handoff',
    ...formatHandoff(packet.handoff, packet.flowName),
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

function formatValidationErrors(errors: string[]): string[] {
  if (errors.length === 0) {
    return [];
  }

  return ['Validation errors:', ...errors.map((error) => `- ${error}`)];
}

function formatOptionalTaskSection(label: string, values: string[]): string[] {
  if (values.length === 0) {
    return [`- ${label}: none`];
  }

  return [`- ${label}:`, ...values.map((value) => `  - ${value}`)];
}

function formatTaskNotes(notes: string | undefined): string[] {
  if (!notes) {
    return ['- notes: none'];
  }

  return ['- notes:', ...formatBlock(notes)];
}

function formatChecks(checks: FlowCheck[]): string[] {
  if (checks.length === 0) {
    return ['- none'];
  }

  return checks.map(
    (check) =>
      `- ${check.name}: ${check.command} (cwd: ${check.cwd}, required: ${check.required})`,
  );
}

function formatFlowRules(rules: string[]): string[] {
  return rules.map((rule) => `- ${rule}`);
}

function formatBlock(value: string): string[] {
  const lines = value.trim().split(/\r?\n/);
  return lines.length === 0 ? ['(empty)'] : lines;
}

function formatHandoff(value: string, flowName: StartWorkPacket['flowName']): string[] {
  return formatBlock(value).map((line) =>
    line.startsWith('Current flow:') ? `Current flow: ${flowName}` : line,
  );
}
