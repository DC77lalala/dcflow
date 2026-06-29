import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
          '.flow/checks/default.yaml',
          'AGENTS.md',
          'CLAUDE.md',
        ]),
      );

      const validation = await validateFlowFiles(root);
      expect(validation.ok).toBe(true);

      const config = await readFile(join(root, '.flow/config.yaml'), 'utf8');
      expect(config).toContain('name: demo-project');

      const agents = await readFile(join(root, 'AGENTS.md'), 'utf8');
      expect(agents).toContain('dcflow');
      expect(agents).toContain('flow start');
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

  it('does not overwrite existing files without force', async () => {
    await withTempProject(async (root) => {
      await writeFile(join(root, 'AGENTS.md'), 'existing agent rules');

      await expect(initProject({ root, yes: true, force: false })).rejects.toThrow(
        'AGENTS.md already exists',
      );

      const agents = await readFile(join(root, 'AGENTS.md'), 'utf8');
      expect(agents).toBe('existing agent rules');
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
