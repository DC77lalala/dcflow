import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { initProject } from '../../src/commands/init.js';
import { activateFlowTask, addFlowTask, readTasksFile } from '../../src/core/taskStore.js';
import { validateFlowFiles } from '../../src/core/schemaValidator.js';

async function withInitializedProject<T>(testBody: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), 'dcflow-task-store-'));

  try {
    await initProject({ root, yes: true, force: false, projectName: 'task-demo' });
    return await testBody(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe('task store', () => {
  it('adds a default not_started task to tasks.yaml', async () => {
    await withInitializedProject(async (root) => {
      const task = await addFlowTask({
        root,
        title: '实现登录接口',
        now: new Date('2026-06-29T15:30:00.000+08:00'),
      });

      expect(task).toEqual({
        id: 'task-20260629-153000',
        title: '实现登录接口',
        status: 'not_started',
        priority: 0,
        verification: [],
        evidence: [],
      });

      const rawTasks = await readFile(join(root, '.flow/state/tasks.yaml'), 'utf8');
      const parsed = parse(rawTasks);
      expect(parsed.tasks).toHaveLength(1);
      expect(parsed.tasks[0].title).toBe('实现登录接口');

      const validation = await validateFlowFiles(root);
      expect(validation.ok).toBe(true);
    });
  });

  it('rejects blank task titles before changing the state file', async () => {
    await withInitializedProject(async (root) => {
      await expect(addFlowTask({ root, title: '   ' })).rejects.toThrow('Task title is required.');

      const tasksFile = await readTasksFile(root);
      expect(tasksFile.tasks).toEqual([]);
    });
  });

  it('keeps task ids unique when two tasks are created in the same second', async () => {
    await withInitializedProject(async (root) => {
      const now = new Date('2026-06-29T15:30:00.000+08:00');

      const first = await addFlowTask({ root, title: '第一个任务', now });
      const second = await addFlowTask({ root, title: '第二个任务', now });

      expect(first.id).toBe('task-20260629-153000');
      expect(second.id).toBe('task-20260629-153000-2');
    });
  });

  it('activates one task and resets the previous active task', async () => {
    await withInitializedProject(async (root) => {
      const now = new Date('2026-06-29T15:30:00.000+08:00');
      const first = await addFlowTask({ root, title: 'first task', now });
      const second = await addFlowTask({ root, title: 'second task', now });

      await activateFlowTask({ root, taskId: first.id });
      const activated = await activateFlowTask({ root, taskId: second.id });

      expect(activated.id).toBe(second.id);
      expect(activated.status).toBe('active');

      const tasksFile = await readTasksFile(root);
      expect(tasksFile.tasks).toEqual([
        expect.objectContaining({ id: first.id, status: 'not_started' }),
        expect.objectContaining({ id: second.id, status: 'active' }),
      ]);

      const validation = await validateFlowFiles(root);
      expect(validation.ok).toBe(true);
    });
  });

  it('rejects unknown task ids without changing task states', async () => {
    await withInitializedProject(async (root) => {
      const task = await addFlowTask({
        root,
        title: 'first task',
        now: new Date('2026-06-29T15:30:00.000+08:00'),
      });

      await expect(activateFlowTask({ root, taskId: 'missing-task' })).rejects.toThrow(
        'Task not found: missing-task',
      );

      const tasksFile = await readTasksFile(root);
      expect(tasksFile.tasks).toEqual([
        expect.objectContaining({ id: task.id, status: 'not_started' }),
      ]);
    });
  });
});
