import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { initProject } from '../../src/commands/init.js';
import { switchCommand, switchFlow } from '../../src/commands/switch.js';
import { validateFlowFiles } from '../../src/core/schemaValidator.js';

async function withInitializedProject<T>(testBody: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), 'dcflow-switch-'));

  try {
    await initProject({ root, yes: true, force: false, projectName: 'switch-demo' });
    return await testBody(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function readConfig(root: string) {
  return parse(await readFile(join(root, '.flow/config.yaml'), 'utf8'));
}

describe('switch command', () => {
  it('switches the current flow strategy to loop', async () => {
    await withInitializedProject(async (root) => {
      const result = await switchFlow({ root, strategy: 'loop' });

      expect(result).toEqual({
        previous: 'harness',
        current: 'loop',
        changed: true,
      });

      const config = await readConfig(root);
      expect(config.flow.current).toBe('loop');
      expect(config.project.name).toBe('switch-demo');
      expect(config.adapters.enabled).toEqual(['claude', 'codex']);

      const validation = await validateFlowFiles(root);
      expect(validation.ok).toBe(true);
    });
  });

  it('reports unchanged when switching to the current strategy', async () => {
    await withInitializedProject(async (root) => {
      const result = await switchFlow({ root, strategy: 'harness' });

      expect(result).toEqual({
        previous: 'harness',
        current: 'harness',
        changed: false,
      });
    });
  });

  it('rejects unsupported strategies without changing config', async () => {
    await withInitializedProject(async (root) => {
      await expect(switchFlow({ root, strategy: 'unknown' })).rejects.toThrow(
        'Unsupported flow strategy: unknown. Supported strategies: harness, loop.',
      );

      const config = await readConfig(root);
      expect(config.flow.current).toBe('harness');
    });
  });

  it('requires a strategy argument', async () => {
    await withInitializedProject(async (root) => {
      await expect(switchFlow({ root, strategy: undefined })).rejects.toThrow(
        'Flow strategy is required. Supported strategies: harness, loop.',
      );
    });
  });

  it('prints readable switch summary lines', async () => {
    await withInitializedProject(async (root) => {
      const lines = await switchCommand({ root, strategy: 'loop' });

      expect(lines).toEqual([
        'Flow switched: harness -> loop',
        'Updated .flow/config.yaml',
      ]);
    });
  });

  it('prints readable unchanged summary lines', async () => {
    await withInitializedProject(async (root) => {
      const lines = await switchCommand({ root, strategy: 'harness' });

      expect(lines).toEqual([
        'Flow unchanged: harness',
        'Updated .flow/config.yaml',
      ]);
    });
  });
});
