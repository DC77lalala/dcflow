import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

export type ProjectType = 'custom' | 'node' | 'java-maven' | 'vue';

export type ProjectDetection = {
  type: ProjectType;
  signals: string[];
  packageName?: string;
};

/**
 * 判断文件是否存在。
 *
 * Node 的 `stat` 找不到文件时会抛异常，这里统一转成 boolean，
 * 让项目检测逻辑保持直线式阅读。
 */
async function fileExists(root: string, fileName: string): Promise<boolean> {
  try {
    const result = await stat(join(root, fileName));
    return result.isFile();
  } catch {
    return false;
  }
}

/**
 * 从 package.json 里读取项目名。
 *
 * 如果 package.json 写坏了，这里不抛出异常中断 init，
 * 因为项目名可以回退到目录名或用户显式传入的名称。
 */
async function readPackageName(root: string): Promise<string | undefined> {
  try {
    const raw = await readFile(join(root, 'package.json'), 'utf8');
    const parsed = JSON.parse(raw) as { name?: unknown };
    return typeof parsed.name === 'string' && parsed.name.length > 0 ? parsed.name : undefined;
  } catch {
    return undefined;
  }
}

/**
 * 检测项目类型。
 *
 * 检测结果只用于生成默认模板，不会替代用户后续配置。
 * 优先级：Vue > Maven > Node > Custom。
 */
export async function detectProject(root: string): Promise<ProjectDetection> {
  const signals: string[] = [];
  const hasPackageJson = await fileExists(root, 'package.json');
  const hasPomXml = await fileExists(root, 'pom.xml');
  const hasViteTs = await fileExists(root, 'vite.config.ts');
  const hasViteJs = await fileExists(root, 'vite.config.js');
  const hasPnpmLock = await fileExists(root, 'pnpm-lock.yaml');

  if (hasPackageJson) {
    signals.push('package.json');
  }
  if (hasPomXml) {
    signals.push('pom.xml');
  }
  if (hasViteTs) {
    signals.push('vite.config.ts');
  }
  if (hasViteJs) {
    signals.push('vite.config.js');
  }
  if (hasPnpmLock) {
    signals.push('pnpm-lock.yaml');
  }

  const packageName = hasPackageJson ? await readPackageName(root) : undefined;

  if (hasPackageJson && (hasViteTs || hasViteJs)) {
    return { type: 'vue', signals, packageName };
  }

  if (hasPomXml) {
    return { type: 'java-maven', signals, packageName };
  }

  if (hasPackageJson) {
    return { type: 'node', signals, packageName };
  }

  return { type: 'custom', signals, packageName };
}
