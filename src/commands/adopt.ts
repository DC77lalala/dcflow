import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { stringify } from 'yaml';
import { detectProject, type ProjectDetection } from '../core/projectDetector.js';
import { renderTemplate } from '../core/templateRenderer.js';
import { type FlowCheck } from '../schemas/checks.js';

export type AdoptOptions = {
  root?: string;
  projectName?: string;
};

export type AdoptResult = {
  root: string;
  projectName: string;
  detection: ProjectDetection;
  created: string[];
  skipped: string[];
  foundAiFiles: string[];
  reportPath: string;
};

type FileToWrite = {
  relativePath: string;
  content: string;
};

const AI_ENTRY_FILES = ['AGENTS.md', 'CLAUDE.md', '.cursorrules'] as const;

/**
 * 将 dcflow 安全接入已有项目。
 *
 * adopt 和 init 的最大区别是“不覆盖”。老项目可能已经有 AGENTS.md、CLAUDE.md
 * 或手写规范，所以这里只创建缺失文件，并把发现的信息写进 adoption report。
 */
export async function adoptProject(options: AdoptOptions = {}): Promise<AdoptResult> {
  const root = resolve(options.root ?? process.cwd());
  const detection = await detectProject(root);
  const projectName = options.projectName ?? detection.packageName ?? basename(root);
  const foundAiFiles = await findExistingAiFiles(root);
  const checks = await buildChecks(root, detection);
  const files = buildAdoptionFiles({
    projectName,
    detection,
    foundAiFiles,
    checks,
  });
  const created: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const target = join(root, file.relativePath);

    if (await pathExists(target)) {
      skipped.push(file.relativePath);
      continue;
    }

    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, file.content, 'utf8');
    created.push(file.relativePath);
  }

  return {
    root,
    projectName,
    detection,
    created,
    skipped,
    foundAiFiles,
    reportPath: '.flow/adoption-report.md',
  };
}

export async function adoptCommand(options: AdoptOptions = {}): Promise<string[]> {
  const result = await adoptProject(options);
  return formatAdoptResult(result);
}

export function formatAdoptResult(result: AdoptResult): string[] {
  const lines = [
    `dcflow adopted ${result.projectName}`,
    `Detected: ${result.detection.type}`,
    `Report: ${result.reportPath}`,
  ];

  for (const file of result.created) {
    lines.push(`Created: ${file}`);
  }

  for (const file of result.skipped) {
    lines.push(`Skipped: ${file}`);
  }

  if (result.foundAiFiles.length > 0) {
    lines.push(`Existing AI files: ${result.foundAiFiles.join(', ')}`);
  }

  return lines;
}

function buildAdoptionFiles(options: {
  projectName: string;
  detection: ProjectDetection;
  foundAiFiles: string[];
  checks: FlowCheck[];
}): FileToWrite[] {
  const templateVars = {
    projectName: options.projectName,
    flowName: 'harness',
  };

  return [
    {
      relativePath: '.flow/config.yaml',
      content: stringify({
        project: { name: options.projectName },
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
      content: stringify({ checks: options.checks }),
    },
    {
      relativePath: '.flow/adoption-report.md',
      content: buildAdoptionReport(options),
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

async function buildChecks(root: string, detection: ProjectDetection): Promise<FlowCheck[]> {
  if (detection.type === 'java-maven') {
    return [
      {
        name: 'maven test',
        command: 'mvn test',
        cwd: '.',
        required: true,
      },
    ];
  }

  if (detection.type === 'node' || detection.type === 'vue') {
    const scripts = await readPackageScripts(root);
    const checks: FlowCheck[] = [];

    if (scripts.has('test')) {
      checks.push({
        name: 'npm test',
        command: 'npm run test',
        cwd: '.',
        required: true,
      });
    }

    if (scripts.has('build')) {
      checks.push({
        name: 'npm build',
        command: 'npm run build',
        cwd: '.',
        required: true,
      });
    }

    if (checks.length > 0) {
      return checks;
    }
  }

  return [
    {
      name: 'placeholder check',
      command: 'node --version',
      cwd: '.',
      required: true,
    },
  ];
}

async function readPackageScripts(root: string): Promise<Set<string>> {
  try {
    const raw = await readFile(join(root, 'package.json'), 'utf8');
    const parsed = JSON.parse(stripBom(raw)) as { scripts?: Record<string, unknown> };
    const scripts = parsed.scripts ?? {};

    return new Set(
      Object.entries(scripts)
        .filter(([, value]) => typeof value === 'string')
        .map(([name]) => name),
    );
  } catch {
    return new Set();
  }
}

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

async function findExistingAiFiles(root: string): Promise<string[]> {
  const found: string[] = [];

  for (const file of AI_ENTRY_FILES) {
    if (await pathExists(join(root, file))) {
      found.push(file);
    }
  }

  return found;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function buildAdoptionReport(options: {
  projectName: string;
  detection: ProjectDetection;
  foundAiFiles: string[];
  checks: FlowCheck[];
}): string {
  const lines = [
    '# dcflow Adoption Report',
    '',
    '## Project',
    '',
    `- project: ${options.projectName}`,
    `- detected type: ${options.detection.type}`,
    `- signals: ${formatListInline(options.detection.signals)}`,
    '',
    '## Existing AI Files',
    '',
    ...formatListBlock(options.foundAiFiles),
    '',
    '## Generated Checks',
    '',
    ...options.checks.map((check) => `- ${check.command} (${check.name}, required: ${check.required})`),
    '',
    '## Notes',
    '',
    '- Existing AI entry files were not overwritten.',
    '- Review `.flow/checks/default.yaml` before relying on `dcflow finish`.',
    '- Add a task with `dcflow task add "task title"` and activate it with `dcflow task active <task-id>`.',
    '',
  ];

  return lines.join('\n');
}

function formatListInline(values: string[]): string {
  if (values.length === 0) {
    return 'none';
  }

  return values.join(', ');
}

function formatListBlock(values: string[]): string[] {
  if (values.length === 0) {
    return ['- none'];
  }

  return values.map((value) => `- ${value}`);
}

const HANDOFF_TEMPLATE = `# Flow Handoff

Project: {{projectName}}
Current flow: {{flowName}}

## Current State

- Existing project adopted into dcflow.
- No active task has been created yet.
- Review .flow/adoption-report.md before the first AI session.

## Next Step

- Run \`dcflow task add "task title"\` to create the first tracked task.
- Run \`dcflow task active <task-id>\` to select the current task.
- Run \`dcflow start\` to generate the AI work packet.
`;

const AGENTS_TEMPLATE = `# {{projectName}} AI Flow Entry

This existing project is adopted by dcflow.

## Session Start

1. Run \`flow status\` to inspect current flow state.
2. Run \`flow start\` to read the active task and project handoff.
3. Work only on the active task unless the user changes scope.

## Session End

1. Run \`flow check\`.
2. Run \`flow finish\`.
3. Leave blockers and verification evidence in dcflow state.
`;
