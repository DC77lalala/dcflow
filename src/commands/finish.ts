import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import { runChecks, type CheckResult, type CheckRunResult } from './check.js';
import { finishActiveTask, readTasksFile } from '../core/taskStore.js';
import { configSchema } from '../schemas/config.js';
import { type FlowTask } from '../schemas/tasks.js';

export type FinishCommandOptions = {
  root?: string;
  now?: Date;
};

export type FinishResult = {
  ok: boolean;
  status: Extract<FlowTask['status'], 'passing' | 'blocked'>;
  activeTask: FlowTask;
  checks: CheckRunResult;
  handoffPath: string;
  tasksPath: string;
};

/**
 * 完成当前 flow 会话。
 *
 * 这一步是质量闭环：先跑本地校验，再把结果写回任务证据和 handoff。
 * required check 全过才算 passing；否则任务进入 blocked，方便下次会话直接接上失败点。
 */
export async function runFinish(options: FinishCommandOptions = {}): Promise<FinishResult> {
  const root = resolve(options.root ?? process.cwd());
  const now = options.now ?? new Date();
  const config = await readConfig(root);
  const activeTask = await readActiveTask(root);
  const checks = await runChecks({ root });
  const status: FinishResult['status'] = checks.ok ? 'passing' : 'blocked';
  const evidence = checks.results.map((check) => formatEvidence(now, check));
  const updatedTask = await finishActiveTask({
    root,
    status,
    evidence,
  });

  await writeHandoff(root, {
    projectName: config.project.name,
    flowName: config.flow.current,
    task: updatedTask,
    checks,
    status,
    now,
  });

  return {
    ok: checks.ok,
    status,
    activeTask: updatedTask,
    checks,
    handoffPath: '.flow/state/handoff.md',
    tasksPath: '.flow/state/tasks.yaml',
  };
}

export async function finishCommand(options: FinishCommandOptions = {}): Promise<string[]> {
  const result = await runFinish(options);
  return formatFinishResult(result);
}

export function formatFinishResult(result: FinishResult): string[] {
  const lines = [
    'Finishing active task...',
    `Task: ${result.activeTask.id} ${result.activeTask.title}`,
    `Result: ${result.status}`,
    `Checks: ${result.checks.passed} passed, ${result.checks.failed} failed`,
    `Updated ${result.tasksPath}`,
    `Updated ${result.handoffPath}`,
  ];

  if (!result.ok) {
    lines.push('Required checks failed.');
  }

  return lines;
}

async function readActiveTask(root: string): Promise<FlowTask> {
  const tasksFile = await readTasksFile(root);
  const activeTask = tasksFile.tasks.find((task) => task.status === 'active');

  if (!activeTask) {
    throw new Error('No active task found. Run `dcflow task active <task-id>` first.');
  }

  return activeTask;
}

async function readConfig(root: string) {
  const raw = await readFile(join(root, '.flow', 'config.yaml'), 'utf8');
  return configSchema.parse(parse(raw));
}

async function writeHandoff(
  root: string,
  options: {
    projectName: string;
    flowName: string;
    task: FlowTask;
    checks: CheckRunResult;
    status: FinishResult['status'];
    now: Date;
  },
): Promise<void> {
  const lines = [
    '# Flow Handoff',
    '',
    `Project: ${options.projectName}`,
    `Flow: ${options.flowName}`,
    '',
    '## Last Finish',
    `- time: ${options.now.toISOString()}`,
    `- task: ${options.task.id} ${options.task.title}`,
    `- result: ${options.status}`,
    `- checks: ${options.checks.passed} passed, ${options.checks.failed} failed`,
    '',
    '## Check Results',
    ...formatCheckSummary(options.checks.results),
    '',
    '## Next Step',
    ...formatNextStep(options.status),
    '',
  ];

  await writeFile(join(root, '.flow', 'state', 'handoff.md'), lines.join('\n'), 'utf8');
}

function formatEvidence(now: Date, check: CheckResult): string {
  const result = check.ok ? 'PASS' : 'FAIL';
  return `${now.toISOString()} ${result} ${check.name} (required: ${check.required}, exitCode: ${check.exitCode})`;
}

function formatCheckSummary(results: CheckResult[]): string[] {
  if (results.length === 0) {
    return ['- none'];
  }

  return results.map((check) => {
    const result = check.ok ? 'PASS' : 'FAIL';
    return `- ${result} ${check.name} (required: ${check.required}, exitCode: ${check.exitCode})`;
  });
}

function formatNextStep(status: FinishResult['status']): string[] {
  if (status === 'passing') {
    return ['- Pick or add the next task, then run `dcflow task active <task-id>`.'];
  }

  return ['- Resolve failed required checks, then run `dcflow check` or `dcflow finish` again.'];
}
