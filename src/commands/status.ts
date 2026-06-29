import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import { validateFlowFiles } from '../core/schemaValidator.js';
import { readTasksFile } from '../core/taskStore.js';
import { configSchema } from '../schemas/config.js';
import { type FlowTask } from '../schemas/tasks.js';

export type StatusCommandOptions = {
  root?: string;
};

export type FlowStatus = {
  projectName: string;
  flowName: string;
  taskCount: number;
  activeTask?: FlowTask;
  validationOk: boolean;
  validationErrors: string[];
};

/**
 * 汇总当前项目的 flow 状态。
 *
 * `status` 是给人看的轻量入口：先告诉你项目和任务概况，
 * 再把 schema 校验结果展示出来，方便尽早发现 `.flow` 被写坏。
 */
export async function getFlowStatus(options: StatusCommandOptions = {}): Promise<FlowStatus> {
  const root = resolve(options.root ?? process.cwd());
  const config = await readConfig(root);
  const tasksFile = await readTasksFile(root);
  const validation = await validateFlowFiles(root);
  const activeTask = tasksFile.tasks.find((task) => task.status === 'active');

  return {
    projectName: config.project.name,
    flowName: config.flow.current,
    taskCount: tasksFile.tasks.length,
    activeTask,
    validationOk: validation.ok,
    validationErrors: validation.errors,
  };
}

export async function statusCommand(options: StatusCommandOptions = {}): Promise<string[]> {
  const status = await getFlowStatus(options);
  const lines = [
    `Project: ${status.projectName}`,
    `Flow: ${status.flowName}`,
    `Tasks: ${status.taskCount}`,
    `Active task: ${formatActiveTask(status.activeTask)}`,
    `Validation: ${status.validationOk ? 'ok' : 'failed'}`,
  ];

  if (!status.validationOk) {
    lines.push(...status.validationErrors.map((error) => `- ${error}`));
  }

  return lines;
}

async function readConfig(root: string) {
  const raw = await readFile(join(root, '.flow', 'config.yaml'), 'utf8');
  return configSchema.parse(parse(raw));
}

function formatActiveTask(task: FlowTask | undefined): string {
  if (!task) {
    return 'none';
  }

  return `${task.id} ${task.title}`;
}
