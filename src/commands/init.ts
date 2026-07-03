import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { stringify } from 'yaml';
import {
  buildConflictTemplatePath,
  formatConflictTimestamp,
  isTemplateConflictCandidate,
  type TemplateConflict,
} from '../core/conflictTemplates.js';
import { detectProject } from '../core/projectDetector.js';
import { renderTemplate } from '../core/templateRenderer.js';
import { getTemplates, resolveLanguage, type TemplateLanguage } from '../templates/index.js';

export type InitOptions = {
  root?: string;
  yes?: boolean;
  force?: boolean;
  projectName?: string;
  language?: string;
  now?: Date;
};

export type InitResult = {
  root: string;
  projectName: string;
  language: TemplateLanguage;
  created: string[];
  skipped: string[];
  conflicts: TemplateConflict[];
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
  const language = resolveLanguage(options.language);

  if (!options.yes && !options.projectName) {
    throw new Error('Interactive init is not implemented yet. Use --yes for default initialization.');
  }

  const files = buildInitialFiles(projectName, language);
  const created: string[] = [];
  const skipped: string[] = [];
  const conflicts: TemplateConflict[] = [];
  const timestamp = formatConflictTimestamp(options.now ?? new Date());
  const existingFiles = new Set<string>();

  for (const file of files) {
    const target = join(root, file.relativePath);
    const exists = await pathExists(target);
    if (exists) {
      existingFiles.add(file.relativePath);
    }

    if (exists && !force && !isTemplateConflictCandidate(file.relativePath)) {
      throw new Error(
        `${file.relativePath} already exists. This project may already be initialized. Use adopt for existing projects, or inspect .flow before running init.`,
      );
    }
  }

  for (const file of files) {
    const target = join(root, file.relativePath);
    const exists = existingFiles.has(file.relativePath);

    if (exists && force) {
      skipped.push(file.relativePath);
    }

    if (exists && !force && isTemplateConflictCandidate(file.relativePath)) {
      skipped.push(file.relativePath);
      const templateCopyPath = buildConflictTemplatePath(file.relativePath, timestamp);
      const templateTarget = join(root, templateCopyPath);
      await mkdir(join(templateTarget, '..'), { recursive: true });
      await writeFile(templateTarget, file.content, 'utf8');
      created.push(templateCopyPath);
      conflicts.push({
        originalPath: file.relativePath,
        templateCopyPath,
        reason: 'existing-ai-entry',
      });
      continue;
    }

    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, file.content, 'utf8');
    created.push(file.relativePath);
  }

  return {
    root,
    projectName,
    language,
    created,
    skipped,
    conflicts,
  };
}

function buildInitialFiles(projectName: string, language: TemplateLanguage): FileToWrite[] {
  const templates = getTemplates(language);
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
        language,
        adapters: { enabled: ['claude', 'codex'] },
      }),
    },
    {
      relativePath: '.flow/state/tasks.yaml',
      content: stringify({ tasks: [] }),
    },
    {
      relativePath: '.flow/state/handoff.md',
      content: renderTemplate(templates.handoff.init, templateVars),
    },
    {
      relativePath: '.flow/work-packet.md',
      content: renderTemplate(templates.workPacket, templateVars),
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
      relativePath: '.flow/docs/README.md',
      content: templates.workspaceDocs.docsReadme,
    },
    {
      relativePath: '.flow/attachments/README.md',
      content: templates.workspaceDocs.attachmentsReadme,
    },
    {
      relativePath: 'AGENTS.md',
      content: renderTemplate(templates.agents.init, templateVars),
    },
    {
      relativePath: 'CLAUDE.md',
      content: renderTemplate(templates.agents.init, templateVars),
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
