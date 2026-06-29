import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateFlowFiles } from '../../src/core/schemaValidator.js';

function fixturePath(name: string): string {
  return resolve('tests/fixtures', name);
}

describe('flow schema validation', () => {
  it('accepts a valid .flow workspace', async () => {
    const result = await validateFlowFiles(fixturePath('valid-flow'));

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects more than one active task', async () => {
    const result = await validateFlowFiles(fixturePath('invalid-multiple-active'));

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('tasks.yaml: only one task can be active at a time, found 2');
  });

  it('reports missing required task fields with readable paths', async () => {
    const result = await validateFlowFiles(fixturePath('invalid-missing-field'));

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('tasks.yaml: tasks.0.title is required');
  });

  it('reports malformed YAML as a readable validation error', async () => {
    const result = await validateFlowFiles(fixturePath('invalid-yaml'));

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('tasks.yaml: failed to parse YAML');
  });
});
