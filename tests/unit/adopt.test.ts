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
          '.flow/checks/default.yaml',
          '.flow/adoption-report.md',
          'CLAUDE.md',
        ]),
      );
      expect(result.skipped).toEqual(expect.arrayContaining(['AGENTS.md']));
      expect(result.foundAiFiles).toEqual(['AGENTS.md']);

      const agents = await readFile(join(root, 'AGENTS.md'), 'utf8');
      expect(agents).toBe('existing agent rules');

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
      expect(report).toContain('# dcflow Adoption Report');
      expect(report).toContain('- project: legacy-node-app');
      expect(report).toContain('- detected type: node');
      expect(report).toContain('- AGENTS.md');
      expect(report).toContain('- npm run test');
      expect(report).toContain('- npm run build');

      const validation = await validateFlowFiles(root);
      expect(validation.ok).toBe(true);
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

  it('prints readable adoption summary lines', async () => {
    await withTempProject(async (root) => {
      await writeFile(join(root, 'CLAUDE.md'), 'existing claude rules', 'utf8');

      const lines = await adoptCommand({ root, projectName: 'summary-demo' });

      expect(lines[0]).toBe('dcflow adopted summary-demo');
      expect(lines).toContain('Detected: custom');
      expect(lines).toContain('Created: .flow/config.yaml');
      expect(lines).toContain('Skipped: CLAUDE.md');
      expect(lines).toContain('Report: .flow/adoption-report.md');
    });
  });
});
