export type TemplateVariables = Record<string, string | number | boolean | undefined>;

/**
 * 简单模板渲染器。
 *
 * 模板变量格式是 `{{name}}`。未知变量渲染为空字符串，
 * 避免把 `{{placeholder}}` 泄漏到生成的 AGENTS.md 或 yaml 中。
 */
export function renderTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = variables[key];
    return value === undefined ? '' : String(value);
  });
}
