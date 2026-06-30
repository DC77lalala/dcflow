import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parse, stringify } from 'yaml';
import { type FlowTask, type TasksFile, tasksFileSchema } from '../schemas/tasks.js';

export type AddFlowTaskOptions = {
  root?: string;
  title: string;
  now?: Date;
};

export type ActivateFlowTaskOptions = {
  root?: string;
  taskId: string;
};

export type FinishActiveTaskOptions = {
  root?: string;
  status: Extract<FlowTask['status'], 'passing' | 'blocked'>;
  evidence: string[];
  notes?: string;
};

const TASKS_FILE_PATH = ['.flow', 'state', 'tasks.yaml'] as const;

/**
 * 读取 `.flow/state/tasks.yaml` 并做 schema 校验。
 *
 * 后续 `start/finish/status` 都会依赖任务状态，所以这里统一做解析和校验，
 * 避免每个命令各自手写 YAML 读取逻辑。
 */
export async function readTasksFile(root = process.cwd()): Promise<TasksFile> {
  const raw = await readFile(tasksPath(root), 'utf8');
  const parsed = parse(raw);
  return tasksFileSchema.parse(parsed);
}

/**
 * 向任务池追加一个任务。
 *
 * Plan 3 先不支持交互式字段，统一给新任务设置最保守的默认值：
 * 未开始、优先级 0、没有验证命令、没有证据。
 */
export async function addFlowTask(options: AddFlowTaskOptions): Promise<FlowTask> {
  const title = options.title.trim();

  if (title.length === 0) {
    throw new Error('Task title is required.');
  }

  const root = resolve(options.root ?? process.cwd());
  const tasksFile = await readTasksFile(root);
  const id = buildUniqueTaskId(options.now ?? new Date(), tasksFile.tasks);
  const task: FlowTask = {
    id,
    title,
    status: 'not_started',
    priority: 0,
    verification: [],
    evidence: [],
  };

  tasksFile.tasks.push(task);
  await writeTasksFile(root, tasksFile);

  return task;
}

/**
 * 选择当前 active 任务。
 *
 * 这里先查找目标任务，再重写状态，保证传入不存在的 id 时不会改坏原任务池。
 * dcflow 约定同一时间最多一个 active 任务，后续 `start` 会直接读取它。
 */
export async function activateFlowTask(options: ActivateFlowTaskOptions): Promise<FlowTask> {
  const root = resolve(options.root ?? process.cwd());
  const taskId = options.taskId.trim();
  const tasksFile = await readTasksFile(root);
  const target = tasksFile.tasks.find((task) => task.id === taskId);

  if (!target) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const updatedTasks = tasksFile.tasks.map((task) => ({
    ...task,
    status: task.id === taskId ? 'active' : downgradeActiveStatus(task.status),
  }));
  const updatedTarget = updatedTasks.find((task) => task.id === taskId);

  await writeTasksFile(root, { tasks: updatedTasks });

  return updatedTarget!;
}

/**
 * 收尾当前 active 任务。
 *
 * `finish` 会把一次会话的校验结果沉淀为任务证据，并把 active 任务推进到
 * `passing` 或 `blocked`。这里统一做写回，避免命令层直接拼 YAML。
 */
export async function finishActiveTask(options: FinishActiveTaskOptions): Promise<FlowTask> {
  const root = resolve(options.root ?? process.cwd());
  const tasksFile = await readTasksFile(root);
  const activeTask = tasksFile.tasks.find((task) => task.status === 'active');

  if (!activeTask) {
    throw new Error('No active task found. Run `dcflow task active <task-id>` first.');
  }

  const updatedTasks = tasksFile.tasks.map((task) => {
    if (task.id !== activeTask.id) {
      return task;
    }

    return {
      ...task,
      status: options.status,
      evidence: [...task.evidence, ...options.evidence],
      notes: mergeTaskNotes(task.notes, options.notes),
    };
  });
  const updatedTask = updatedTasks.find((task) => task.id === activeTask.id);

  await writeTasksFile(root, { tasks: updatedTasks });

  return updatedTask!;
}

async function writeTasksFile(root: string, tasksFile: TasksFile): Promise<void> {
  await writeFile(tasksPath(root), stringify(tasksFile), 'utf8');
}

function tasksPath(root: string): string {
  return join(resolve(root), ...TASKS_FILE_PATH);
}

function buildUniqueTaskId(now: Date, existingTasks: FlowTask[]): string {
  const baseId = `task-${formatTaskTimestamp(now)}`;
  const existingIds = new Set(existingTasks.map((task) => task.id));

  if (!existingIds.has(baseId)) {
    return baseId;
  }

  // 同一秒内连续创建任务时加序号，保证 id 稳定且不覆盖旧任务。
  let index = 2;
  while (existingIds.has(`${baseId}-${index}`)) {
    index += 1;
  }

  return `${baseId}-${index}`;
}

function downgradeActiveStatus(status: FlowTask['status']): FlowTask['status'] {
  return status === 'active' ? 'not_started' : status;
}

function mergeTaskNotes(current: string | undefined, incoming: string | undefined): string | undefined {
  if (!incoming || incoming.trim().length === 0) {
    return current;
  }

  if (!current || current.trim().length === 0) {
    return incoming.trim();
  }

  return `${current.trim()}\n\n${incoming.trim()}`;
}

function formatTaskTimestamp(now: Date): string {
  const year = now.getFullYear();
  const month = pad2(now.getMonth() + 1);
  const day = pad2(now.getDate());
  const hour = pad2(now.getHours());
  const minute = pad2(now.getMinutes());
  const second = pad2(now.getSeconds());

  return `${year}${month}${day}-${hour}${minute}${second}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}
