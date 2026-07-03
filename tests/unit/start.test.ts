import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { initProject } from '../../src/commands/init.js';
import { activateTaskCommand } from '../../src/commands/task.js';
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
      expect(packet.handoff).toContain('Flow 交接');
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

      expect(lines).toContain('# dcflow 工作包');
      expect(lines).toContain('项目: start-demo');
      expect(lines).toContain('Flow: harness');
      expect(lines).toContain('## 当前任务');
      expect(lines).toContain('- id: task-20260630-093000');
      expect(lines).toContain('- 标题: implement login api');
      expect(lines).toContain('- 状态: active');
      expect(lines).toContain('- placeholder check: node --version (cwd: ., required: true)');
      expect(lines).toContain('## 校验命令');
      expect(lines).toContain('## 交接信息');
      expect(lines).toContain('校验: ok');
    });
  });

  it('prints updated handoff after activating a task through the task command', async () => {
    await withInitializedProject(async (root) => {
      const task = await addFlowTask({
        root,
        title: 'implement login api',
        now: new Date('2026-06-30T09:30:00.000+08:00'),
      });
      await activateTaskCommand({ root, taskId: task.id });

      const lines = await startCommand({ root });

      expect(lines).toContain('## 交接信息');
      expect(lines).toContain('## 当前任务');
      expect(lines).toContain('- id: task-20260630-093000');
      expect(lines).toContain('- 标题: implement login api');
      expect(lines).not.toContain('还没有创建 active 任务。');
    });
  });

  it('prints Chinese Harness-specific flow rules when the current flow is harness', async () => {
    await withInitializedProject(async (root) => {
      const task = await addFlowTask({
        root,
        title: 'implement login api',
        now: new Date('2026-06-30T09:30:00.000+08:00'),
      });
      await activateFlowTask({ root, taskId: task.id });

      const lines = await startCommand({ root });

      expect(lines).toContain('## Flow Rules: Harness');
      expect(lines).toContain('- Blueprint：修改前先读取并保持项目架构意图。');
      expect(lines).toContain('- Spec：先遵守项目规范池，再选择实现方式。');
      expect(lines).toContain('- Finish：沉淀可复用经验，让 flow 随任务持续改进。');
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
      expect(lines).toContain('- Observe：行动前先观察当前状态、证据和约束。');
      expect(lines).toContain('- Plan：选择最小下一步，并说明预期结果。');
      expect(lines).toContain('- Act：只围绕 active 任务做聚焦修改。');
      expect(lines).toContain('- Verify：运行配置的检查，并对照计划判断结果。');
      expect(lines).toContain('- Reflect：记录变更、失败点和下一轮 loop 应做什么。');
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
      expect(lines).toContain('当前 flow: loop');
      expect(lines).not.toContain('当前 flow: harness');
    });
  });

  it('prints English work packet when language is en-US', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dcflow-start-en-'));

    try {
      await initProject({
        root,
        yes: true,
        force: false,
        projectName: 'start-demo',
        language: 'en-US',
      });
      const task = await addFlowTask({
        root,
        title: 'implement login api',
        now: new Date('2026-06-30T09:30:00.000+08:00'),
      });
      await activateFlowTask({ root, taskId: task.id });

      const lines = await startCommand({ root });

      expect(lines).toContain('# dcflow Work Packet');
      expect(lines).toContain('Project: start-demo');
      expect(lines).toContain('Validation: ok');
      expect(lines).toContain('- title: implement login api');
      expect(lines).toContain('- Blueprint: read and preserve the project architecture intent before editing.');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
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
