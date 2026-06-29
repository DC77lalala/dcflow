import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { stringify } from 'yaml';
import { detectProject } from '../core/projectDetector.js';
import { renderTemplate } from '../core/templateRenderer.js';

export type InitOptions = {
  root?: string;
  yes?: boolean;
  force?: boolean;
  projectName?: string;
};

export type InitResult = {
  root: string;
  projectName: string;
  created: string[];
  skipped: string[];
};

type FileToWrite = {
  relativePath: string;
  content: string;
};

/**
 * 初始化一个项目的 `.flow` 结构。
 *
 * 第一版先支持 `--yes` 非交互模式，保证测试和 CI 不会卡在命令行提问。
 * 后续可以在这里接入 @inquirer/prompts 做交互式选择。
 */
export async function initProject(options: InitOptions = {}): Promise<InitResult> {
  const root = resolve(options.root ?? process.cwd());
  const force = options.force ?? false;
  const detection = await detectProject(root);
  const projectName = options.projectName ?? detection.packageName ?? basename(root);

  if (!options.yes && !options.projectName) {
    throw new Error('Interactive init is not implemented yet. Use --yes for default initialization.');
  }

  const files = buildInitialFiles(projectName);
  const created: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const target = join(root, file.relativePath);
    const exists = await pathExists(target);

    if (exists && !force) {
      throw new Error(`${file.relativePath} already exists. Re-run with --force to overwrite it.`);
    }

    if (exists && force) {
      skipped.push(file.relativePath);
    }

    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, file.content, 'utf8');
    created.push(file.relativePath);
  }

  return {
    root,
    projectName,
    created,
    skipped,
  };
}

function buildInitialFiles(projectName: string): FileToWrite[] {
  const templateVars = {
    projectName,
    flowName: 'harness',
  };

  return [
    {
      relativePath: '.flow/config.yaml',
      content: stringify({
        project: { name: projectName },
        flow: { current: 'harness' },
        adapters: { enabled: ['claude', 'codex'] },
      }),
    },
    {
      relativePath: '.flow/state/tasks.yaml',
      content: stringify({ tasks: [] }),
    },
    {
      relativePath: '.flow/state/handoff.md',
      content: renderTemplate(HANDOFF_TEMPLATE, templateVars),
    },
    {
      relativePath: '.flow/checks/default.yaml',
      content: stringify({
        checks: [
          {
            name: 'placeholder check',
            command: 'node --version',
            cwd: '.',
            required: true,
          },
        ],
      }),
    },
    {
      relativePath: 'AGENTS.md',
      content: renderTemplate(AGENTS_TEMPLATE, templateVars),
    },
    {
      relativePath: 'CLAUDE.md',
      content: renderTemplate(AGENTS_TEMPLATE, templateVars),
    },
  ];
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

// 读取已有文件的能力会在 Plan 7 adopt 中扩展；这里保留函数用于后续局部更新。
export async function readTextIfExists(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return undefined;
  }
}

const HANDOFF_TEMPLATE = `# Flow Handoff

Project: {{projectName}}
Current flow: {{flowName}}

## Current State

- No active task has been created yet.
- Use \`dcflow task add "task title" --active\` after Plan 3 is implemented.

## Next Step

- Run \`dcflow status\` after Plan 3 is implemented.
`;

const AGENTS_TEMPLATE = `# {{projectName}} AI Flow Entry

This project uses dcflow to manage AI-assisted development.

## Session Start

1. Run \`flow start\` to read the current task and flow context.
2. Follow the generated work packet.
3. Do not mark work complete without verification evidence.

## Session End

1. Run \`flow check\`.
2. Run \`flow finish\`.
3. Record blockers and unresolved risks before ending the session.
`;
