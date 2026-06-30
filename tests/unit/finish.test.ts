import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import { describe, expect, it } from 'vitest';
import { initProject } from '../../src/commands/init.js';
import { finishCommand, runFinish } from '../../src/commands/finish.js';
import { activateFlowTask, addFlowTask, readTasksFile } from '../../src/core/taskStore.js';
import { validateFlowFiles } from '../../src/core/schemaValidator.js';

async function withInitializedProject<T>(testBody: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), 'dcflow-finish-'));

  try {
    await initProject({ root, yes: true, force: false, projectName: 'finish-demo' });
    return await testBody(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function writeChecks(root: string, checks: unknown[]): Promise<void> {
  const checksDir = join(root, '.flow', 'checks');
  await mkdir(checksDir, { recursive: true });
  await writeFile(join(checksDir, 'default.yaml'), stringify({ checks }), 'utf8');
}

describe('finish command', () => {
  it('marks the active task as passing and records check evidence when required checks pass', async () => {
    await withInitializedProject(async (root) => {
      const task = await addFlowTask({
        root,
        title: 'implement finish command',
        now: new Date('2026-06-30T09:00:00.000+08:00'),
      });
      await activateFlowTask({ root, taskId: task.id });
      await writeChecks(root, [
        {
          name: 'node smoke',
          command: 'node --version',
          cwd: '.',
          required: true,
        },
      ]);

      const result = await runFinish({
        root,
        now: new Date('2026-06-30T10:00:00.000+08:00'),
      });

      expect(result.ok).toBe(true);
      expect(result.status).toBe('passing');
      expect(result.activeTask).toMatchObject({
        id: task.id,
        title: 'implement finish command',
        status: 'passing',
      });

      const tasksFile = await readTasksFile(root);
      expect(tasksFile.tasks[0]).toMatchObject({
        id: task.id,
        status: 'passing',
        evidence: [expect.stringContaining('PASS node smoke')],
      });

      const handoff = await readFile(join(root, '.flow', 'state', 'handoff.md'), 'utf8');
      expect(handoff).toContain('# Flow Handoff');
      expect(handoff).toContain('- task: task-20260630-090000 implement finish command');
      expect(handoff).toContain('- result: passing');
      expect(handoff).toContain('- checks: 1 passed, 0 failed');
      expect(handoff).toContain('- PASS node smoke');

      const validation = await validateFlowFiles(root);
      expect(validation.ok).toBe(true);
    });
  });

  it('marks the active task as blocked and records failed required check evidence', async () => {
    await withInitializedProject(async (root) => {
      const task = await addFlowTask({
        root,
        title: 'fix failing checks',
        now: new Date('2026-06-30T09:10:00.000+08:00'),
      });
      await activateFlowTask({ root, taskId: task.id });
      await writeChecks(root, [
        {
          name: 'required failure',
          command: 'node -e "process.exit(4)"',
          cwd: '.',
          required: true,
        },
      ]);

      const result = await runFinish({
        root,
        now: new Date('2026-06-30T10:10:00.000+08:00'),
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe('blocked');
      expect(result.checks.failed).toBe(1);

      const tasksFile = await readTasksFile(root);
      expect(tasksFile.tasks[0]).toMatchObject({
        id: task.id,
        status: 'blocked',
        evidence: [expect.stringContaining('FAIL required failure')],
      });

      const handoff = await readFile(join(root, '.flow', 'state', 'handoff.md'), 'utf8');
      expect(handoff).toContain('- result: blocked');
      expect(handoff).toContain('- FAIL required failure');
    });
  });

  it('prints readable finish lines and exposes required check failures to the CLI', async () => {
    await withInitializedProject(async (root) => {
      const task = await addFlowTask({
        root,
        title: 'finish output',
        now: new Date('2026-06-30T09:20:00.000+08:00'),
      });
      await activateFlowTask({ root, taskId: task.id });
      await writeChecks(root, [
        {
          name: 'node smoke',
          command: 'node --version',
          cwd: '.',
          required: true,
        },
      ]);

      const lines = await finishCommand({
        root,
        now: new Date('2026-06-30T10:20:00.000+08:00'),
      });

      expect(lines[0]).toBe('Finishing active task...');
      expect(lines).toContain('Task: task-20260630-092000 finish output');
      expect(lines).toContain('Result: passing');
      expect(lines).toContain('Checks: 1 passed, 0 failed');
      expect(lines).toContain('Updated .flow/state/tasks.yaml');
      expect(lines).toContain('Updated .flow/state/handoff.md');
    });
  });

  it('requires an active task before running checks or changing state', async () => {
    await withInitializedProject(async (root) => {
      await addFlowTask({
        root,
        title: 'not active yet',
        now: new Date('2026-06-30T09:30:00.000+08:00'),
      });

      await expect(runFinish({ root })).rejects.toThrow(
        'No active task found. Run `dcflow task active <task-id>` first.',
      );

      const rawTasks = await readFile(join(root, '.flow', 'state', 'tasks.yaml'), 'utf8');
      const parsed = parse(rawTasks);
      expect(parsed.tasks[0].status).toBe('not_started');
    });
  });
});
