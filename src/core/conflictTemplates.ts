export type TemplateConflict = {
  originalPath: string;
  templateCopyPath: string;
  reason: 'existing-ai-entry';
};

const MERGE_CANDIDATE_FILES = ['AGENTS.md', 'CLAUDE.md'] as const;

/**
 * 只有 Markdown 形式的 AI 入口文件适合生成模板副本。
 * 状态文件和非 Markdown 规则文件默认只跳过或报错，避免误导用户覆盖项目状态。
 */
export function isTemplateConflictCandidate(relativePath: string): boolean {
  return MERGE_CANDIDATE_FILES.includes(relativePath as (typeof MERGE_CANDIDATE_FILES)[number]);
}

export function buildConflictTemplatePath(relativePath: string, timestamp: string): string {
  const safeName = relativePath.replace(/[\\/]/g, '-').replace(/\.md$/i, '');
  return `.flow/conflicts/${timestamp}-${safeName}.dcflow-template.md`;
}

export function formatConflictTimestamp(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  const second = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}-${hour}${minute}${second}`;
}
