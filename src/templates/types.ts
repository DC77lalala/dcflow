import { type FlowConfig } from '../schemas/config.js';
import { type FlowCheck } from '../schemas/checks.js';
import { type ProjectDetection } from '../core/projectDetector.js';

export type TemplateLanguage = 'zh-CN' | 'en-US';

export type TemplateVariables = {
  projectName: string;
  flowName: FlowConfig['flow']['current'];
};

export type AdoptionReportOptions = {
  projectName: string;
  detection: ProjectDetection;
  foundAiFiles: string[];
  conflicts?: Array<{
    originalPath: string;
    templateCopyPath: string;
    reason: string;
  }>;
  checks: FlowCheck[];
};

export type StartLabels = {
  title: string;
  project: string;
  validation: string;
  activeTask: string;
  taskTitle: string;
  taskStatus: string;
  taskPriority: string;
  verification: string;
  evidence: string;
  notes: string;
  none: string;
  emptyBlock: string;
  checks: string;
  handoff: string;
  validationErrors: string;
};

export type FlowStrategyTemplate = {
  title: string;
  rules: string[];
};

export type LanguageTemplates = {
  language: TemplateLanguage;
  handoff: {
    init: string;
    adopt: string;
    activeTask: string;
  };
  agents: {
    init: string;
    adopt: string;
  };
  workspaceDocs: {
    docsReadme: string;
    attachmentsReadme: string;
  };
  workPacket: string;
  adoptionReport: (options: AdoptionReportOptions) => string;
  start: StartLabels;
  flowStrategies: Record<FlowConfig['flow']['current'], FlowStrategyTemplate>;
};
