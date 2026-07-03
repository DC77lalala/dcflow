import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { initProject } from '../../src/commands/init.js';
import { validateFlowFiles } from '../../src/core/schemaValidator.js';

async function withTempProject<T>(setup: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), 'dcflow-init-'));
  try {
    return await setup(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe('init project', () => {
  it('creates a valid .flow workspace and agent entry files', async () => {
    await withTempProject(async (root) => {
      const result = await initProject({
        root,
        yes: true,
        force: false,
        projectName: 'demo-project',
      });

      expect(result.created).toEqual(
        expect.arrayContaining([
          '.flow/config.yaml',
          '.flow/state/tasks.yaml',
          '.flow/state/handoff.md',
          '.flow/work-packet.md',
          '.flow/checks/default.yaml',
          '.flow/docs/README.md',
          '.flow/attachments/README.md',
          'AGENTS.md',
          'CLAUDE.md',
        ]),
      );

      const validation = await validateFlowFiles(root);
      expect(validation.ok).toBe(true);

      const config = await readFile(join(root, '.flow/config.yaml'), 'utf8');
      expect(config).toContain('name: demo-project');
      expect(config).toContain('language: zh-CN');

      const agents = await readFile(join(root, 'AGENTS.md'), 'utf8');
      expect(agents).toContain('dcflow');
      expect(agents).toContain('会话开始');
      expect(agents).toContain('.flow/work-packet.md');
      expect(agents).toContain('更新 `.flow/work-packet.md`');
      expect(agents).toContain('更新 `.flow/state/tasks.yaml`');
      expect(agents).toContain('evidence');
      expect(agents).toContain('passing');
      expect(agents).toContain('blocked');
      expect(agents).toContain('## Work Rules');
      expect(agents).toContain('一次只允许一个任务处于 `active` 状态');
      expect(agents).toContain('不要为了让结果看起来通过而弱化验证规则');
      expect(agents).toContain('优先依赖仓库中的持久化文件');
      expect(agents).toContain('中文注释');
      expect(agents).toContain('不要自行提交代码');
      expect(agents).toContain('等用户确认后再开始写代码');
      expect(agents).toContain('.flow/docs/');
      expect(agents).toContain('.flow/attachments/');

      const claude = await readFile(join(root, 'CLAUDE.md'), 'utf8');
      expect(claude).toContain('.flow/work-packet.md');
      expect(claude).toContain('更新 `.flow/work-packet.md`');
      expect(claude).toContain('更新 `.flow/state/tasks.yaml`');
      expect(claude).toContain('evidence');
      expect(claude).toContain('passing');
      expect(claude).toContain('blocked');
      expect(claude).toContain('## Work Rules');
      expect(claude).toContain('一次只允许一个任务处于 `active` 状态');
      expect(claude).toContain('不要为了让结果看起来通过而弱化验证规则');
      expect(claude).toContain('优先依赖仓库中的持久化文件');
      expect(claude).toContain('中文注释');
      expect(claude).toContain('不要自行提交代码');
      expect(claude).toContain('等用户确认后再开始写代码');
      expect(claude).toContain('.flow/docs/');
      expect(claude).toContain('.flow/attachments/');

      const workPacket = await readFile(join(root, '.flow/work-packet.md'), 'utf8');
      expect(workPacket).toContain('当前任务工作包');
      expect(workPacket).toContain('由 agent 和程序员维护');
      expect(workPacket).toContain('.flow/state/handoff.md');
      expect(workPacket).toContain('.flow/docs/');
      expect(workPacket).toContain('.flow/attachments/');

      const docsReadme = await readFile(join(root, '.flow/docs/README.md'), 'utf8');
      expect(docsReadme).toContain('需求');
      expect(docsReadme).toContain('Plan');

      const attachmentsReadme = await readFile(join(root, '.flow/attachments/README.md'), 'utf8');
      expect(attachmentsReadme).toContain('原型图');
      expect(attachmentsReadme).toContain('需求文档');

      const handoff = await readFile(join(root, '.flow/state/handoff.md'), 'utf8');
      expect(handoff).toContain('Flow 交接');
      expect(handoff).toContain('当前 flow: harness');
    });
  });

  it('can generate English templates when language is en-US', async () => {
    await withTempProject(async (root) => {
      await initProject({
        root,
        yes: true,
        force: false,
        projectName: 'english-demo',
        language: 'en-US',
      });

      const config = await readFile(join(root, '.flow/config.yaml'), 'utf8');
      expect(config).toContain('language: en-US');

      const agents = await readFile(join(root, 'AGENTS.md'), 'utf8');
      expect(agents).toContain('AI Flow Entry');
      expect(agents).toContain('Session Start');
      expect(agents).toContain('.flow/work-packet.md');
      expect(agents).toContain('Update `.flow/work-packet.md`');
      expect(agents).toContain('Update `.flow/state/tasks.yaml`');
      expect(agents).toContain('evidence');
      expect(agents).toContain('passing');
      expect(agents).toContain('blocked');
      expect(agents).toContain('## Work Rules');
      expect(agents).toContain('Only one task may be `active` at a time');
      expect(agents).toContain('Do not weaken verification rules');
      expect(agents).toContain('Prefer persistent files in the repository');
      expect(agents).toContain('Chinese comments');
      expect(agents).toContain('Do not commit code');
      expect(agents).toContain('wait for user approval before writing code');
      expect(agents).toContain('.flow/docs/');
      expect(agents).toContain('.flow/attachments/');

      const workPacket = await readFile(join(root, '.flow/work-packet.md'), 'utf8');
      expect(workPacket).toContain('Current Task Work Packet');
      expect(workPacket).toContain('maintained by agents and programmers');
      expect(workPacket).toContain('.flow/state/handoff.md');
      expect(workPacket).toContain('.flow/docs/');
      expect(workPacket).toContain('.flow/attachments/');

      const docsReadme = await readFile(join(root, '.flow/docs/README.md'), 'utf8');
      expect(docsReadme).toContain('requirements');
      expect(docsReadme).toContain('plan');

      const attachmentsReadme = await readFile(join(root, '.flow/attachments/README.md'), 'utf8');
      expect(attachmentsReadme).toContain('prototypes');
      expect(attachmentsReadme).toContain('requirement documents');

      const handoff = await readFile(join(root, '.flow/state/handoff.md'), 'utf8');
      expect(handoff).toContain('Flow Handoff');
      expect(handoff).toContain('Current flow: harness');
    });
  });

  it('uses detected package name when projectName is not provided', async () => {
    await withTempProject(async (root) => {
      await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'package-demo' }));

      await initProject({ root, yes: true, force: false });

      const config = await readFile(join(root, '.flow/config.yaml'), 'utf8');
      expect(config).toContain('name: package-demo');
    });
  });

  it('creates a current handoff without obsolete plan instructions', async () => {
    await withTempProject(async (root) => {
      await initProject({ root, yes: true, force: false, projectName: 'handoff-demo' });

      const handoff = await readFile(join(root, '.flow/state/handoff.md'), 'utf8');

      expect(handoff).toContain('运行 `dcflow task add "任务标题"`');
      expect(handoff).toContain('运行 `dcflow task active <task-id>`');
      expect(handoff).not.toContain('after Plan 3 is implemented');
      expect(handoff).not.toContain('--active');
    });
  });

  it('keeps existing AI entry files and writes timestamped template copies', async () => {
    await withTempProject(async (root) => {
      await writeFile(join(root, 'AGENTS.md'), 'existing agent rules');

      const result = await initProject({
        root,
        yes: true,
        force: false,
        projectName: 'conflict-init-demo',
        now: new Date('2026-07-03T10:20:30.000Z'),
      });

      const conflictPath = '.flow/conflicts/20260703-102030-AGENTS.dcflow-template.md';
      expect(result.skipped).toEqual(['AGENTS.md']);
      expect(result.conflicts).toEqual([
        {
          originalPath: 'AGENTS.md',
          templateCopyPath: conflictPath,
          reason: 'existing-ai-entry',
        },
      ]);
      expect(result.created).toEqual(
        expect.arrayContaining([
          '.flow/config.yaml',
          '.flow/state/tasks.yaml',
          '.flow/state/handoff.md',
          '.flow/work-packet.md',
          '.flow/checks/default.yaml',
          '.flow/docs/README.md',
          '.flow/attachments/README.md',
          conflictPath,
          'CLAUDE.md',
        ]),
      );

      const agents = await readFile(join(root, 'AGENTS.md'), 'utf8');
      expect(agents).toBe('existing agent rules');

      const templateCopy = await readFile(join(root, conflictPath), 'utf8');
      expect(templateCopy).toContain('# conflict-init-demo AI Flow 入口');
      expect(templateCopy).toContain('## Work Rules');
      expect(templateCopy).toContain('不要自行提交代码');
    });
  });

  it('fails before writing when existing .flow state files would be overwritten', async () => {
    await withTempProject(async (root) => {
      await writeFile(join(root, 'AGENTS.md'), 'existing agent rules');
      await mkdir(join(root, '.flow/state'), { recursive: true });
      await writeFile(join(root, '.flow/state/tasks.yaml'), 'tasks:\n  - existing\n', 'utf8');

      await expect(
        initProject({
          root,
          yes: true,
          force: false,
          projectName: 'state-conflict-demo',
          now: new Date('2026-07-03T10:20:30.000Z'),
        }),
      ).rejects.toThrow('.flow/state/tasks.yaml already exists');

      const agents = await readFile(join(root, 'AGENTS.md'), 'utf8');
      expect(agents).toBe('existing agent rules');

      await expect(readFile(join(root, '.flow/config.yaml'), 'utf8')).rejects.toThrow();
      await expect(
        readFile(
          join(root, '.flow/conflicts/20260703-102030-AGENTS.dcflow-template.md'),
          'utf8',
        ),
      ).rejects.toThrow();
    });
  });

  it('overwrites existing generated files when force is enabled', async () => {
    await withTempProject(async (root) => {
      await writeFile(join(root, 'AGENTS.md'), 'existing agent rules');

      await initProject({ root, yes: true, force: true, projectName: 'forced-demo' });

      const agents = await readFile(join(root, 'AGENTS.md'), 'utf8');
      expect(agents).toContain('forced-demo');
      expect(agents).not.toBe('existing agent rules');
    });
  });
});
