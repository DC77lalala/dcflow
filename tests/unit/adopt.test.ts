import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { adoptCommand, adoptProject } from '../../src/commands/adopt.js';
import { validateFlowFiles } from '../../src/core/schemaValidator.js';

async function withTempProject<T>(testBody: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), 'dcflow-adopt-'));

  try {
    return await testBody(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe('adopt command', () => {
  it('creates a valid .flow workspace without overwriting existing AI entry files', async () => {
    await withTempProject(async (root) => {
      await writeFile(
        join(root, 'package.json'),
        JSON.stringify({
          name: 'legacy-node-app',
          scripts: {
            build: 'tsc -p tsconfig.json',
            test: 'vitest run',
          },
        }),
        'utf8',
      );
      await writeFile(join(root, 'AGENTS.md'), 'existing agent rules', 'utf8');

      const result = await adoptProject({ root });

      expect(result.projectName).toBe('legacy-node-app');
      expect(result.detection.type).toBe('node');
      expect(result.created).toEqual(
        expect.arrayContaining([
          '.flow/config.yaml',
          '.flow/state/tasks.yaml',
          '.flow/state/handoff.md',
          '.flow/work-packet.md',
          '.flow/checks/default.yaml',
          '.flow/docs/README.md',
          '.flow/attachments/README.md',
          '.flow/adoption-report.md',
          'CLAUDE.md',
        ]),
      );
      expect(result.skipped).toEqual(expect.arrayContaining(['AGENTS.md']));
      expect(result.foundAiFiles).toEqual(['AGENTS.md']);

      const agents = await readFile(join(root, 'AGENTS.md'), 'utf8');
      expect(agents).toBe('existing agent rules');

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
      expect(workPacket).toContain('.flow/state/tasks.yaml');
      expect(workPacket).toContain('.flow/state/handoff.md');

      const docsReadme = await readFile(join(root, '.flow/docs/README.md'), 'utf8');
      expect(docsReadme).toContain('需求');
      expect(docsReadme).toContain('Plan');

      const attachmentsReadme = await readFile(join(root, '.flow/attachments/README.md'), 'utf8');
      expect(attachmentsReadme).toContain('原型图');
      expect(attachmentsReadme).toContain('需求文档');

      const checks = parse(await readFile(join(root, '.flow/checks/default.yaml'), 'utf8'));
      expect(checks.checks).toEqual([
        {
          name: 'npm test',
          command: 'npm run test',
          cwd: '.',
          required: true,
        },
        {
          name: 'npm build',
          command: 'npm run build',
          cwd: '.',
          required: true,
        },
      ]);

      const report = await readFile(join(root, '.flow/adoption-report.md'), 'utf8');
      expect(report).toContain('# dcflow 接入报告');
      expect(report).toContain('- 项目: legacy-node-app');
      expect(report).toContain('- 识别类型: node');
      expect(report).toContain('- AGENTS.md');
      expect(report).toContain('- npm run test');
      expect(report).toContain('- npm run build');

      const validation = await validateFlowFiles(root);
      expect(validation.ok).toBe(true);
    });
  });

  it('can generate English adoption templates when language is en-US', async () => {
    await withTempProject(async (root) => {
      await adoptProject({ root, projectName: 'english-adopt-demo', language: 'en-US' });

      const config = await readFile(join(root, '.flow/config.yaml'), 'utf8');
      expect(config).toContain('language: en-US');

      const report = await readFile(join(root, '.flow/adoption-report.md'), 'utf8');
      expect(report).toContain('# dcflow Adoption Report');
      expect(report).toContain('- project: english-adopt-demo');
      expect(report).toContain('- detected type: custom');

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
      expect(workPacket).toContain('.flow/state/tasks.yaml');
      expect(workPacket).toContain('.flow/state/handoff.md');

      const docsReadme = await readFile(join(root, '.flow/docs/README.md'), 'utf8');
      expect(docsReadme).toContain('requirements');
      expect(docsReadme).toContain('plan');

      const attachmentsReadme = await readFile(join(root, '.flow/attachments/README.md'), 'utf8');
      expect(attachmentsReadme).toContain('prototypes');
      expect(attachmentsReadme).toContain('requirement documents');
    });
  });

  it('uses Maven checks when adopting a Maven project', async () => {
    await withTempProject(async (root) => {
      await writeFile(join(root, 'pom.xml'), '<project />', 'utf8');

      await adoptProject({ root, projectName: 'legacy-maven-app' });

      const checks = parse(await readFile(join(root, '.flow/checks/default.yaml'), 'utf8'));
      expect(checks.checks).toEqual([
        {
          name: 'maven test',
          command: 'mvn test',
          cwd: '.',
          required: true,
        },
      ]);
    });
  });

  it('infers Node checks from UTF-8 BOM package.json files', async () => {
    await withTempProject(async (root) => {
      await writeFile(
        join(root, 'package.json'),
        '\uFEFF{"name":"bom-node-app","scripts":{"test":"node --version","build":"node --version"}}',
        'utf8',
      );

      const result = await adoptProject({ root });

      expect(result.projectName).toBe('bom-node-app');

      const checks = parse(await readFile(join(root, '.flow/checks/default.yaml'), 'utf8'));
      expect(checks.checks.map((check: { command: string }) => check.command)).toEqual([
        'npm run test',
        'npm run build',
      ]);
    });
  });

  it('skips existing .flow files on repeated adoption instead of overwriting them', async () => {
    await withTempProject(async (root) => {
      await adoptProject({ root, projectName: 'repeat-demo' });
      await writeFile(join(root, '.flow/state/tasks.yaml'), 'tasks:\n  - broken\n', 'utf8');

      const result = await adoptProject({ root, projectName: 'repeat-demo' });

      expect(result.skipped).toEqual(expect.arrayContaining(['.flow/state/tasks.yaml']));

      const tasks = await readFile(join(root, '.flow/state/tasks.yaml'), 'utf8');
      expect(tasks).toBe('tasks:\n  - broken\n');
    });
  });

  it('writes timestamped template copies when existing AI entry files conflict', async () => {
    await withTempProject(async (root) => {
      const existingAgents = [
        '# Existing Agent Rules',
        '',
        '## Work Rules',
        '',
        '- 用户自己维护的规则。',
        '',
      ].join('\n');
      await writeFile(join(root, 'AGENTS.md'), existingAgents, 'utf8');

      const result = await adoptProject({
        root,
        projectName: 'conflict-demo',
        now: new Date('2026-07-03T10:20:30.000Z'),
      });

      const conflictPath = '.flow/conflicts/20260703-102030-AGENTS.dcflow-template.md';
      expect(result.skipped).toEqual(expect.arrayContaining(['AGENTS.md']));
      expect(result.conflicts).toEqual([
        {
          originalPath: 'AGENTS.md',
          templateCopyPath: conflictPath,
          reason: 'existing-ai-entry',
        },
      ]);
      expect(result.created).toEqual(expect.arrayContaining([conflictPath]));

      const agents = await readFile(join(root, 'AGENTS.md'), 'utf8');
      expect(agents).toBe(existingAgents);

      const templateCopy = await readFile(join(root, conflictPath), 'utf8');
      expect(templateCopy).toContain('# conflict-demo AI Flow 入口');
      expect(templateCopy).toContain('## Work Rules');
      expect(templateCopy).toContain('一次只允许一个任务处于 `active` 状态');
      expect(templateCopy).toContain('不要自行提交代码');

      const report = await readFile(join(root, '.flow/adoption-report.md'), 'utf8');
      expect(report).toContain('conflicts/20260703-102030-AGENTS.dcflow-template.md');
    });
  });

  it('prints readable adoption summary lines', async () => {
    await withTempProject(async (root) => {
      await writeFile(join(root, 'CLAUDE.md'), 'existing claude rules', 'utf8');

      const lines = await adoptCommand({
        root,
        projectName: 'summary-demo',
        now: new Date('2026-07-03T10:20:30.000Z'),
      });

      expect(lines[0]).toBe('dcflow adopted summary-demo');
      expect(lines).toContain('Detected: custom');
      expect(lines).toContain('Created: .flow/config.yaml');
      expect(lines).toContain('Skipped: CLAUDE.md');
      expect(lines).toContain(
        'Conflict: CLAUDE.md -> template copy .flow/conflicts/20260703-102030-CLAUDE.dcflow-template.md',
      );
      expect(lines).toContain('Report: .flow/adoption-report.md');
    });
  });
});
