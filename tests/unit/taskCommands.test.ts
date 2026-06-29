import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { initProject } from '../../src/commands/init.js';
import { activateTaskCommand, addTaskCommand, listTaskCommand } from '../../src/commands/task.js';

async function withInitializedProject<T>(testBody: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), 'dcflow-task-command-'));

  try {
    await initProject({ root, yes: true, force: false, projectName: 'command-demo' });
    return await testBody(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe('task commands', () => {
  it('prints a message after adding a task', async () => {
    await withInitializedProject(async (root) => {
      const lines = await addTaskCommand({
        root,
        title: '实现登录接口',
        now: new Date('2026-06-29T15:30:00.000+08:00'),
      });

      expect(lines).toEqual(['added task-20260629-153000: 实现登录接口']);
    });
  });

  it('prints an empty list message when no tasks exist', async () => {
    await withInitializedProject(async (root) => {
      const lines = await listTaskCommand({ root });

      expect(lines).toEqual(['No tasks found.']);
    });
  });

  it('prints existing tasks with status and priority', async () => {
    await withInitializedProject(async (root) => {
      await addTaskCommand({
        root,
        title: '实现登录接口',
        now: new Date('2026-06-29T15:30:00.000+08:00'),
      });

      const lines = await listTaskCommand({ root });

      expect(lines).toEqual(['- task-20260629-153000 [not_started] P0 实现登录接口']);
    });
  });

  it('prints a message after activating a task', async () => {
    await withInitializedProject(async (root) => {
      await addTaskCommand({
        root,
        title: 'first task',
        now: new Date('2026-06-29T15:30:00.000+08:00'),
      });

      const lines = await activateTaskCommand({
        root,
        taskId: 'task-20260629-153000',
      });

      expect(lines).toEqual(['active task-20260629-153000: first task']);
    });
  });
});
