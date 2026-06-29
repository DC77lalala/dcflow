import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { YAMLParseError, parse } from 'yaml';
import { ZodError, type ZodIssue, type ZodTypeAny } from 'zod';
import { checksFileSchema } from '../schemas/checks.js';
import { configSchema } from '../schemas/config.js';
import { tasksFileSchema, type TasksFile } from '../schemas/tasks.js';

export type ValidationResult = {
  ok: boolean;
  errors: string[];
};

type ParsedFile<T> =
  | { ok: true; data: T }
  | { ok: false; errors: string[] };

const FLOW_FILE_PATHS = {
  config: ['.flow', 'config.yaml'],
  tasks: ['.flow', 'state', 'tasks.yaml'],
  checks: ['.flow', 'checks', 'default.yaml'],
} as const;

/**
 * 校验一个项目根目录下的 `.flow` 文件。
 *
 * 这个函数是后续 `flow status/init/finish` 的共同入口：
 * 先确保配置能被机器读取，再允许继续执行流程，避免坏状态越滚越大。
 */
export async function validateFlowFiles(root: string): Promise<ValidationResult> {
  const errors: string[] = [];

  const config = await readAndValidateYaml(
    join(root, ...FLOW_FILE_PATHS.config),
    'config.yaml',
    configSchema,
  );
  const tasks = await readAndValidateYaml(
    join(root, ...FLOW_FILE_PATHS.tasks),
    'tasks.yaml',
    tasksFileSchema,
  );
  const checks = await readAndValidateYaml(
    join(root, ...FLOW_FILE_PATHS.checks),
    'default.yaml',
    checksFileSchema,
  );

  collectFileErrors(errors, config);
  collectFileErrors(errors, tasks);
  collectFileErrors(errors, checks);

  // 跨字段规则：schema 能检查单个字段，业务规则要在解析后单独检查。
  if (tasks.ok) {
    errors.push(...validateTaskRules(tasks.data));
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

async function readAndValidateYaml<T>(
  path: string,
  label: string,
  schema: ZodTypeAny,
): Promise<ParsedFile<T>> {
  let raw: string;

  try {
    raw = await readFile(path, 'utf8');
  } catch (error) {
    return {
      ok: false,
      errors: [`${label}: failed to read file: ${formatUnknownError(error)}`],
    };
  }

  let parsed: unknown;

  try {
    parsed = parse(raw);
  } catch (error) {
    return {
      ok: false,
      errors: [`${label}: failed to parse YAML: ${formatYamlError(error)}`],
    };
  }

  try {
    return {
      ok: true,
      data: schema.parse(parsed) as T,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        ok: false,
        errors: error.issues.map((issue) => `${label}: ${formatZodIssue(issue)}`),
      };
    }

    return {
      ok: false,
      errors: [`${label}: failed to validate schema: ${formatUnknownError(error)}`],
    };
  }
}

function collectFileErrors<T>(errors: string[], parsed: ParsedFile<T>): void {
  if (!parsed.ok) {
    errors.push(...parsed.errors);
  }
}

function validateTaskRules(tasksFile: TasksFile): string[] {
  const activeCount = tasksFile.tasks.filter((task) => task.status === 'active').length;

  if (activeCount > 1) {
    return [`tasks.yaml: only one task can be active at a time, found ${activeCount}`];
  }

  return [];
}

function formatZodIssue(issue: ZodIssue): string {
  const path = issue.path.join('.');

  if (issue.code === 'invalid_type' && issue.received === 'undefined') {
    return `${path} is required`;
  }

  return path.length > 0 ? `${path}: ${issue.message}` : issue.message;
}

function formatYamlError(error: unknown): string {
  if (error instanceof YAMLParseError) {
    return error.message;
  }

  return formatUnknownError(error);
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
