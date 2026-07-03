import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import { activateFlowTask, addFlowTask, readTasksFile } from '../core/taskStore.js';
import { renderTemplate } from '../core/templateRenderer.js';
import { configSchema } from '../schemas/config.js';
import { type FlowTask } from '../schemas/tasks.js';
import { getTemplates } from '../templates/index.js';

export type TaskCommandOptions = {
  root?: string;
};

export type AddTaskCommandOptions = TaskCommandOptions & {
  title: string;
  now?: Date;
};

export type ActivateTaskCommandOptions = TaskCommandOptions & {
  taskId: string;
};

/**
 * `task add` 的可测试命令核心。
 *
 * CLI 只负责打印这些行；业务逻辑放这里，单元测试可以直接调用。
 */
export async function addTaskCommand(options: AddTaskCommandOptions): Promise<string[]> {
  const task = await addFlowTask(options);
  return [`added ${task.id}: ${task.title}`];
}

export async function activateTaskCommand(options: ActivateTaskCommandOptions): Promise<string[]> {
  const task = await activateFlowTask(options);
  await writeActiveTaskHandoff(options.root, task);

  return [`active ${task.id}: ${task.title}`];
}

/**
 * `task list` 输出一份适合命令行阅读的任务清单。
 *
 * 这里暂时不做表格，保持纯文本，方便复制给 AI 或写进日志。
 */
export async function listTaskCommand(options: TaskCommandOptions = {}): Promise<string[]> {
  const tasksFile = await readTasksFile(options.root);

  if (tasksFile.tasks.length === 0) {
    return ['No tasks found.'];
  }

  return tasksFile.tasks.map(
    (task) => `- ${task.id} [${task.status}] P${task.priority} ${task.title}`,
  );
}

async function writeActiveTaskHandoff(
  rootOption: string | undefined,
  task: FlowTask,
): Promise<void> {
  const root = resolve(rootOption ?? process.cwd());
  const config = await readConfig(root);
  const templates = getTemplates(config.language);
  const content = renderTemplate(templates.handoff.activeTask, {
    projectName: config.project.name,
    flowName: config.flow.current,
    taskId: task.id,
    taskTitle: task.title,
    taskStatus: task.status,
    taskPriority: task.priority,
  });

  await writeFile(join(root, '.flow', 'state', 'handoff.md'), content, 'utf8');
}

async function readConfig(root: string) {
  const raw = await readFile(join(root, '.flow', 'config.yaml'), 'utf8');
  return configSchema.parse(parse(raw));
}
