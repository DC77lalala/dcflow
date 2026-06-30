import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { execaCommand } from 'execa';
import { parse } from 'yaml';
import { checksFileSchema, type FlowCheck } from '../schemas/checks.js';

export type CheckCommandOptions = {
  root?: string;
};

export type CheckResult = {
  name: string;
  command: string;
  cwd: string;
  required: boolean;
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type CheckRunResult = {
  ok: boolean;
  passed: number;
  failed: number;
  results: CheckResult[];
};

/**
 * 执行 `.flow/checks/default.yaml` 中配置的本地检查。
 *
 * required 检查失败会让整体结果失败；optional 检查失败只记录在结果中，
 * 方便后续 `finish` 把验证证据写回任务状态。
 */
export async function runChecks(options: CheckCommandOptions = {}): Promise<CheckRunResult> {
  const root = resolve(options.root ?? process.cwd());
  const checks = await readChecks(root);
  const results: CheckResult[] = [];

  for (const check of checks) {
    results.push(await runOneCheck(root, check));
  }

  const passed = results.filter((result) => result.ok).length;
  const failed = results.length - passed;
  const ok = results.every((result) => result.ok || !result.required);

  return {
    ok,
    passed,
    failed,
    results,
  };
}

export async function checkCommand(options: CheckCommandOptions = {}): Promise<string[]> {
  const result = await runChecks(options);
  return formatCheckRunResult(result);
}

export function formatCheckRunResult(result: CheckRunResult): string[] {
  const lines = ['Running checks...'];

  for (const check of result.results) {
    lines.push('');
    lines.push(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);
    lines.push(`command: ${check.command}`);
    lines.push(`cwd: ${check.cwd}`);
    lines.push(`required: ${check.required}`);
    lines.push(`exitCode: ${check.exitCode}`);

    if (check.stdout.trim().length > 0) {
      lines.push('stdout:');
      lines.push(...indentBlock(check.stdout));
    }

    if (check.stderr.trim().length > 0) {
      lines.push('stderr:');
      lines.push(...indentBlock(check.stderr));
    }
  }

  lines.push('');
  lines.push(`Summary: ${result.passed} passed, ${result.failed} failed`);

  if (!result.ok) {
    lines.push('Required checks failed.');
  }

  return lines;
}

async function readChecks(root: string): Promise<FlowCheck[]> {
  const raw = await readFile(join(root, '.flow', 'checks', 'default.yaml'), 'utf8');
  const parsed = checksFileSchema.parse(parse(raw));
  return parsed.checks;
}

async function runOneCheck(root: string, check: FlowCheck): Promise<CheckResult> {
  const cwd = resolve(root, check.cwd);

  try {
    const result = await execaCommand(check.command, {
      cwd,
      shell: true,
      reject: false,
    });

    return {
      name: check.name,
      command: check.command,
      cwd: check.cwd,
      required: check.required,
      ok: result.exitCode === 0,
      exitCode: result.exitCode ?? 1,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error) {
    return {
      name: check.name,
      command: check.command,
      cwd: check.cwd,
      required: check.required,
      ok: false,
      exitCode: 1,
      stdout: '',
      stderr: formatUnknownError(error),
    };
  }
}

function indentBlock(value: string): string[] {
  return value
    .trim()
    .split(/\r?\n/)
    .map((line) => `  ${line}`);
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
