import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { initProject } from '../../src/commands/init.js';
import { getStartWorkPacket, startCommand } from '../../src/commands/start.js';
import { switchFlow } from '../../src/commands/switch.js';
import { activateFlowTask, addFlowTask } from '../../src/core/taskStore.js';

async function withInitializedProject<T>(testBody: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), 'dcflow-start-'));

  try {
    await initProject({ root, yes: true, force: false, projectName: 'start-demo' });
    return await testBody(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe('start command', () => {
  it('builds a work packet from the active task and flow files', async () => {
    await withInitializedProject(async (root) => {
      const task = await addFlowTask({
        root,
        title: 'implement login api',
        now: new Date('2026-06-30T09:30:00.000+08:00'),
      });
      await activateFlowTask({ root, taskId: task.id });

      const packet = await getStartWorkPacket({ root });

      expect(packet.projectName).toBe('start-demo');
      expect(packet.flowName).toBe('harness');
      expect(packet.activeTask.id).toBe('task-20260630-093000');
      expect(packet.activeTask.title).toBe('implement login api');
      expect(packet.checks).toEqual([
        expect.objectContaining({
          name: 'placeholder check',
          command: 'node --version',
          cwd: '.',
          required: true,
        }),
      ]);
      expect(packet.handoff).toContain('Flow Handoff');
      expect(packet.validationOk).toBe(true);
    });
  });

  it('prints a markdown-style packet for AI tools', async () => {
    await withInitializedProject(async (root) => {
      const task = await addFlowTask({
        root,
        title: 'implement login api',
        now: new Date('2026-06-30T09:30:00.000+08:00'),
      });
      await activateFlowTask({ root, taskId: task.id });

      const lines = await startCommand({ root });

      expect(lines).toContain('# dcflow Work Packet');
      expect(lines).toContain('Project: start-demo');
      expect(lines).toContain('Flow: harness');
      expect(lines).toContain('- id: task-20260630-093000');
      expect(lines).toContain('- title: implement login api');
      expect(lines).toContain('- status: active');
      expect(lines).toContain('- placeholder check: node --version (cwd: ., required: true)');
      expect(lines).toContain('Validation: ok');
    });
  });

  it('prints Harness-specific flow rules when the current flow is harness', async () => {
    await withInitializedProject(async (root) => {
      const task = await addFlowTask({
        root,
        title: 'implement login api',
        now: new Date('2026-06-30T09:30:00.000+08:00'),
      });
      await activateFlowTask({ root, taskId: task.id });

      const lines = await startCommand({ root });

      expect(lines).toContain('## Flow Rules: Harness');
      expect(lines).toContain('- Blueprint: read and preserve the project architecture intent before editing.');
      expect(lines).toContain('- Spec: follow the project rule pool before choosing implementation style.');
      expect(lines).toContain('- Finish: capture reusable lessons so the flow can improve after the task.');
      expect(lines).not.toContain('## Flow Rules: Loop');
    });
  });

  it('prints Loop-specific flow rules after switching the current flow to loop', async () => {
    await withInitializedProject(async (root) => {
      const task = await addFlowTask({
        root,
        title: 'implement login api',
        now: new Date('2026-06-30T09:30:00.000+08:00'),
      });
      await activateFlowTask({ root, taskId: task.id });
      await switchFlow({ root, strategy: 'loop' });

      const lines = await startCommand({ root });

      expect(lines).toContain('Flow: loop');
      expect(lines).toContain('## Flow Rules: Loop');
      expect(lines).toContain('- Observe: inspect current state, evidence, and constraints before acting.');
      expect(lines).toContain('- Plan: choose the smallest next loop step and state the expected outcome.');
      expect(lines).toContain('- Act: make focused changes only for the active task.');
      expect(lines).toContain('- Verify: run configured checks and compare the result with the plan.');
      expect(lines).toContain('- Reflect: record what changed, what failed, and what the next loop should do.');
      expect(lines).not.toContain('## Flow Rules: Harness');
    });
  });

  it('normalizes stale handoff flow labels to the current flow when rendering the work packet', async () => {
    await withInitializedProject(async (root) => {
      const task = await addFlowTask({
        root,
        title: 'implement login api',
        now: new Date('2026-06-30T09:30:00.000+08:00'),
      });
      await activateFlowTask({ root, taskId: task.id });
      await switchFlow({ root, strategy: 'loop' });

      const lines = await startCommand({ root });

      expect(lines).toContain('Flow: loop');
      expect(lines).toContain('Current flow: loop');
      expect(lines).not.toContain('Current flow: harness');
    });
  });

  it('fails when no active task exists', async () => {
    await withInitializedProject(async (root) => {
      await addFlowTask({
        root,
        title: 'implement login api',
        now: new Date('2026-06-30T09:30:00.000+08:00'),
      });

      await expect(startCommand({ root })).rejects.toThrow(
        'No active task found. Run `dcflow task active <task-id>` first.',
      );
    });
  });
});
