import { z } from 'zod';
import { enUsTemplates } from './en-US.js';
import { zhCnTemplates } from './zh-CN.js';
import { type LanguageTemplates, type TemplateLanguage } from './types.js';

export const DEFAULT_LANGUAGE: TemplateLanguage = 'zh-CN';
export const languageSchema = z.enum(['zh-CN', 'en-US']);

const templates: Record<TemplateLanguage, LanguageTemplates> = {
  'zh-CN': zhCnTemplates,
  'en-US': enUsTemplates,
};

export function resolveLanguage(language: string | undefined): TemplateLanguage {
  if (!language || language.trim().length === 0) {
    return DEFAULT_LANGUAGE;
  }

  return languageSchema.parse(language.trim());
}

export function getTemplates(language: TemplateLanguage): LanguageTemplates {
  return templates[language];
}

export type { LanguageTemplates, TemplateLanguage } from './types.js';
