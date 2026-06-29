import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { initProject } from '../../src/commands/init.js';
import { activateFlowTask, addFlowTask } from '../../src/core/taskStore.js';
import { getFlowStatus, statusCommand } from '../../src/commands/status.js';

async function withInitializedProject<T>(testBody: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), 'dcflow-status-'));

  try {
    await initProject({ root, yes: true, force: false, projectName: 'status-demo' });
    return await testBody(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe('status command', () => {
  it('summarizes project flow and task count', async () => {
    await withInitializedProject(async (root) => {
      await addFlowTask({
        root,
        title: '实现登录接口',
        now: new Date('2026-06-29T15:30:00.000+08:00'),
      });

      const status = await getFlowStatus({ root });

      expect(status).toMatchObject({
        projectName: 'status-demo',
        flowName: 'harness',
        taskCount: 1,
        activeTask: undefined,
        validationOk: true,
        validationErrors: [],
      });
    });
  });

  it('prints a concise status report', async () => {
    await withInitializedProject(async (root) => {
      const lines = await statusCommand({ root });

      expect(lines).toEqual([
        'Project: status-demo',
        'Flow: harness',
        'Tasks: 0',
        'Active task: none',
        'Validation: ok',
      ]);
    });
  });

  it('prints the active task when one is selected', async () => {
    await withInitializedProject(async (root) => {
      const task = await addFlowTask({
        root,
        title: 'first task',
        now: new Date('2026-06-29T15:30:00.000+08:00'),
      });
      await activateFlowTask({ root, taskId: task.id });

      const lines = await statusCommand({ root });

      expect(lines).toContain('Active task: task-20260629-153000 first task');
    });
  });
});
