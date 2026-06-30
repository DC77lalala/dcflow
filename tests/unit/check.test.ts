import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { describe, expect, it } from 'vitest';
import { initProject } from '../../src/commands/init.js';
import { checkCommand, runChecks } from '../../src/commands/check.js';

async function withInitializedProject<T>(testBody: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), 'dcflow-check-'));

  try {
    await initProject({ root, yes: true, force: false, projectName: 'check-demo' });
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

describe('check command', () => {
  it('passes when all required checks exit with code 0', async () => {
    await withInitializedProject(async (root) => {
      await writeChecks(root, [
        {
          name: 'node smoke',
          command: 'node --version',
          cwd: '.',
          required: true,
        },
      ]);

      const result = await runChecks({ root });

      expect(result.ok).toBe(true);
      expect(result.passed).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.results[0]).toMatchObject({
        name: 'node smoke',
        ok: true,
        required: true,
        exitCode: 0,
      });
    });
  });

  it('fails when a required check exits with a non-zero code', async () => {
    await withInitializedProject(async (root) => {
      await writeChecks(root, [
        {
          name: 'required failure',
          command: 'node -e "process.exit(7)"',
          cwd: '.',
          required: true,
        },
      ]);

      const result = await runChecks({ root });

      expect(result.ok).toBe(false);
      expect(result.passed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0]).toMatchObject({
        name: 'required failure',
        ok: false,
        required: true,
        exitCode: 7,
      });
    });
  });

  it('reports optional failures without failing the overall run', async () => {
    await withInitializedProject(async (root) => {
      await writeChecks(root, [
        {
          name: 'optional failure',
          command: 'node -e "process.exit(5)"',
          cwd: '.',
          required: false,
        },
      ]);

      const result = await runChecks({ root });

      expect(result.ok).toBe(true);
      expect(result.passed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0]).toMatchObject({
        name: 'optional failure',
        ok: false,
        required: false,
        exitCode: 5,
      });
    });
  });

  it('prints readable check lines and summary', async () => {
    await withInitializedProject(async (root) => {
      await writeChecks(root, [
        {
          name: 'node smoke',
          command: 'node --version',
          cwd: '.',
          required: true,
        },
      ]);

      const lines = await checkCommand({ root });

      expect(lines[0]).toBe('Running checks...');
      expect(lines).toContain('PASS node smoke');
      expect(lines).toContain('command: node --version');
      expect(lines).toContain('Summary: 1 passed, 0 failed');
    });
  });
});
