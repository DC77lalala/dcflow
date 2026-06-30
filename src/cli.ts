import { Command } from 'commander';
import { formatCheckRunResult, runChecks } from './commands/check.js';
import { formatFinishResult, runFinish } from './commands/finish.js';
import { initProject } from './commands/init.js';
import { startCommand } from './commands/start.js';
import { statusCommand } from './commands/status.js';
import { activateTaskCommand, addTaskCommand, listTaskCommand } from './commands/task.js';

export const VERSION = '0.1.0';

/**
 * 创建 dcflow 的命令行程序。
 *
 * 这里故意只“注册命令”，不直接执行命令，方便测试和后续复用。
 * 真正执行入口在 `src/index.ts`，这样测试导入本文件时不会触发 CLI 运行。
 */
export function createProgram(): Command {
  const program = new Command();

  // 顶层命令信息：决定 `dcflow --help` 里显示的名称、说明和版本。
  program
    .name('dcflow')
    .description('AI development flow runtime CLI')
    .version(VERSION);

  // Plan 2 会实现：新项目初始化 .flow 目录和 AI 工具入口文件。
  program
    .command('init')
    .description('Initialize .flow structure for a new project')
    .option('-y, --yes', 'Use default answers and skip interactive prompts')
    .option('-f, --force', 'Overwrite existing generated files')
    .option('--project-name <name>', 'Project name written to .flow/config.yaml')
    .action(async (options: { yes?: boolean; force?: boolean; projectName?: string }) => {
      const result = await initProject({
        yes: options.yes ?? false,
        force: options.force ?? false,
        projectName: options.projectName,
      });

      console.log(`dcflow initialized ${result.projectName} at ${result.root}`);
      for (const file of result.created) {
        console.log(`created ${file}`);
      }
    });

  // Plan 7 会实现：把已有项目的 AGENTS/CLAUDE/feature_list/init.sh 迁移进 .flow。
  program
    .command('adopt')
    .description('Adopt dcflow into an existing project')
    .action(() => {
      console.log('dcflow adopt is not implemented yet. See Plan 7.');
    });

  // task 是一组子命令，后续负责新增任务、列出任务、维护 active 任务。
  const task = program.command('task').description('Manage flow tasks');

  task
    .command('add')
    .argument('<title>', 'task title')
    .description('Add a task to the flow state')
    .action(async (title: string) => {
      const lines = await addTaskCommand({ title });
      printLines(lines);
    });

  task
    .command('list')
    .description('List flow tasks')
    .action(async () => {
      const lines = await listTaskCommand();
      printLines(lines);
    });

  task
    .command('active')
    .argument('<task-id>', 'task id to mark as active')
    .description('Mark one task as the active flow task')
    .action(async (taskId: string) => {
      const lines = await activateTaskCommand({ taskId });
      printLines(lines);
    });

  // Plan 3 会实现：读取 .flow/state，展示当前任务、flow 类型和验证状态。
  program
    .command('status')
    .description('Show current flow status')
    .action(async () => {
      const lines = await statusCommand();
      printLines(lines);
    });

  // Plan 4 会实现：生成给 Claude/Codex/Cursor 使用的当前工作包。
  program
    .command('start')
    .description('Build the current AI work packet')
    .action(async () => {
      const lines = await startCommand();
      printLines(lines);
    });

  // Plan 5 会实现：按 .flow/checks/default.yaml 运行构建、测试或 smoke check。
  program
    .command('check')
    .description('Run configured verification checks')
    .action(async () => {
      const result = await runChecks();
      printLines(formatCheckRunResult(result));

      if (!result.ok) {
        process.exitCode = 1;
      }
    });

  // Plan 6 会实现：记录验证证据、更新 handoff，并推进任务状态。
  program
    .command('finish')
    .description('Finish the current flow session')
    .action(async () => {
      const result = await runFinish();
      printLines(formatFinishResult(result));

      if (!result.ok) {
        process.exitCode = 1;
      }
    });

  // Plan 8 会实现：切换 harness、loop 或未来新增的 flow strategy。
  program
    .command('switch')
    .argument('[strategy]', 'flow strategy name')
    .description('Switch active flow strategy')
    .action((strategy?: string) => {
      console.log(`dcflow switch is not implemented yet. Strategy: ${strategy ?? '(none)'}`);
    });

  return program;
}

/**
 * 运行命令行程序。
 *
 * `argv` 默认使用 Node 进程参数；测试时可以传入自定义参数，
 * 这样不用真的启动一个新进程也能验证 CLI 行为。
 */
export async function main(argv = process.argv): Promise<void> {
  const program = createProgram();
  await program.parseAsync(argv);
}

function printLines(lines: string[]): void {
  for (const line of lines) {
    console.log(line);
  }
}
