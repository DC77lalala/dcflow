import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { stringify } from 'yaml';
import {
  buildConflictTemplatePath,
  formatConflictTimestamp,
  isTemplateConflictCandidate,
  type TemplateConflict,
} from '../core/conflictTemplates.js';
import { detectProject, type ProjectDetection } from '../core/projectDetector.js';
import { renderTemplate } from '../core/templateRenderer.js';
import { type FlowCheck } from '../schemas/checks.js';
import { getTemplates, resolveLanguage, type TemplateLanguage } from '../templates/index.js';

export type AdoptOptions = {
  root?: string;
  projectName?: string;
  language?: string;
  now?: Date;
};

export type AdoptResult = {
  root: string;
  projectName: string;
  language: TemplateLanguage;
  detection: ProjectDetection;
  created: string[];
  skipped: string[];
  conflicts: TemplateConflict[];
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
  const language = resolveLanguage(options.language);
  const foundAiFiles = await findExistingAiFiles(root);
  const checks = await buildChecks(root, detection);
  const files = buildAdoptionFiles({
    projectName,
    language,
    detection,
    foundAiFiles,
    checks,
  });
  const created: string[] = [];
  const skipped: string[] = [];
  const conflicts: TemplateConflict[] = [];
  const timestamp = formatConflictTimestamp(options.now ?? new Date());

  for (const file of files) {
    const target = join(root, file.relativePath);

    if (await pathExists(target)) {
      skipped.push(file.relativePath);

      if (isTemplateConflictCandidate(file.relativePath)) {
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
      }

      continue;
    }

    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, file.content, 'utf8');
    created.push(file.relativePath);
  }

  const reportPath = '.flow/adoption-report.md';
  const reportTarget = join(root, reportPath);
  const reportContent = getTemplates(language).adoptionReport({
    projectName,
    detection,
    foundAiFiles,
    conflicts,
    checks,
  });

  if (await pathExists(reportTarget)) {
    skipped.push(reportPath);
  } else {
    await mkdir(join(reportTarget, '..'), { recursive: true });
    await writeFile(reportTarget, reportContent, 'utf8');
    created.push(reportPath);
  }

  return {
    root,
    projectName,
    language,
    detection,
    created,
    skipped,
    conflicts,
    foundAiFiles,
    reportPath,
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

  for (const conflict of result.conflicts) {
    lines.push(`Conflict: ${conflict.originalPath} -> template copy ${conflict.templateCopyPath}`);
  }

  if (result.foundAiFiles.length > 0) {
    lines.push(`Existing AI files: ${result.foundAiFiles.join(', ')}`);
  }

  return lines;
}

function buildAdoptionFiles(options: {
  projectName: string;
  language: TemplateLanguage;
  detection: ProjectDetection;
  foundAiFiles: string[];
  checks: FlowCheck[];
}): FileToWrite[] {
  const templates = getTemplates(options.language);
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
        language: options.language,
        adapters: { enabled: ['claude', 'codex'] },
      }),
    },
    {
      relativePath: '.flow/state/tasks.yaml',
      content: stringify({ tasks: [] }),
    },
    {
      relativePath: '.flow/state/handoff.md',
      content: renderTemplate(templates.handoff.adopt, templateVars),
    },
    {
      relativePath: '.flow/work-packet.md',
      content: renderTemplate(templates.workPacket, templateVars),
    },
    {
      relativePath: '.flow/checks/default.yaml',
      content: stringify({ checks: options.checks }),
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
      content: renderTemplate(templates.agents.adopt, templateVars),
    },
    {
      relativePath: 'CLAUDE.md',
      content: renderTemplate(templates.agents.adopt, templateVars),
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
