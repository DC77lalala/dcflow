import { activateFlowTask, addFlowTask, readTasksFile } from '../core/taskStore.js';

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
