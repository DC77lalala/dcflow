import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createProgram, VERSION } from '../../src/cli.js';

function collectHelp(): string {
  const program = createProgram();
  return program.helpInformation();
}

describe('dcflow CLI', () => {
  it('exposes the configured version', () => {
    expect(VERSION).toBe('0.1.0');
  });

  it('prints top-level command help', () => {
    const help = collectHelp();

    expect(help).toContain('Usage: dcflow [options] [command]');
    expect(help).toContain('init');
    expect(help).toContain('adopt');
    expect(help).toContain('task');
    expect(help).toContain('status');
    expect(help).toContain('start');
    expect(help).toContain('check');
    expect(help).toContain('finish');
    expect(help).toContain('switch');
  });

  it('prints init command options', () => {
    const program = createProgram();
    const init = program.commands.find((command) => command.name() === 'init');

    expect(init?.helpInformation()).toContain('--yes');
    expect(init?.helpInformation()).toContain('--force');
  });

  it('does not execute the CLI when importing reusable helpers', async () => {
    const originalArgv = process.argv;
    process.argv = ['node', 'dcflow', '--help'];

    try {
      const module = await import('../../src/cli.js');
      expect(module.VERSION).toBe('0.1.0');
    } finally {
      process.argv = originalArgv;
    }
  });

  it('keeps the executable shebang in the build entry only', async () => {
    const source = await readFile(resolve('src/index.ts'), 'utf8');
    expect(source.startsWith('#!')).toBe(false);
  });
});
