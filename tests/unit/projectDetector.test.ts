import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { detectProject } from '../../src/core/projectDetector.js';

async function withTempProject<T>(setup: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), 'dcflow-detector-'));
  try {
    return await setup(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe('project detector', () => {
  it('detects an empty project as custom', async () => {
    await withTempProject(async (root) => {
      const result = await detectProject(root);

      expect(result.type).toBe('custom');
      expect(result.signals).toEqual([]);
    });
  });

  it('detects a Node project from package.json', async () => {
    await withTempProject(async (root) => {
      await writeFile(join(root, 'package.json'), '{"name":"demo"}');

      const result = await detectProject(root);

      expect(result.type).toBe('node');
      expect(result.signals).toContain('package.json');
    });
  });

  it('reads package names from UTF-8 BOM package.json files', async () => {
    await withTempProject(async (root) => {
      await writeFile(join(root, 'package.json'), '\uFEFF{"name":"bom-demo"}', 'utf8');

      const result = await detectProject(root);

      expect(result.type).toBe('node');
      expect(result.packageName).toBe('bom-demo');
    });
  });

  it('detects a Maven project from pom.xml', async () => {
    await withTempProject(async (root) => {
      await writeFile(join(root, 'pom.xml'), '<project></project>');

      const result = await detectProject(root);

      expect(result.type).toBe('java-maven');
      expect(result.signals).toContain('pom.xml');
    });
  });

  it('detects a Vue project when vite config is present', async () => {
    await withTempProject(async (root) => {
      await writeFile(join(root, 'package.json'), '{"name":"demo"}');
      await writeFile(join(root, 'vite.config.ts'), 'export default {};');

      const result = await detectProject(root);

      expect(result.type).toBe('vue');
      expect(result.signals).toEqual(expect.arrayContaining(['package.json', 'vite.config.ts']));
    });
  });
});
