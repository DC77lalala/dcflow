import { type LanguageTemplates } from './types.js';

export const enUsTemplates: LanguageTemplates = {
  language: 'en-US',
  handoff: {
    init: `# Flow Handoff

Project: {{projectName}}
Current flow: {{flowName}}

## Current State

- No active task has been created yet.
- Run \`dcflow task add "task title"\` to create the first task.
- Run \`dcflow task active <task-id>\` to select the current task.

## Next Step

- Run \`dcflow start\` to generate the AI work packet after selecting an active task.
`,
    adopt: `# Flow Handoff

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
`,
    activeTask: `# Flow Handoff

Project: {{projectName}}
Current flow: {{flowName}}

## Active Task

- id: {{taskId}}
- title: {{taskTitle}}
- status: {{taskStatus}}
- priority: {{taskPriority}}

## Next Step

- Run \`dcflow start\` to generate the AI work packet.
- Work only on the active task unless the user explicitly changes scope.
`,
  },
  agents: {
    init: `# {{projectName}} AI Flow Entry

This project uses dcflow to manage AI-assisted development.

## Session Start

1. Read \`.flow/config.yaml\` to confirm the current flow.
2. Read \`.flow/state/tasks.yaml\` to confirm the single active task.
3. Read \`.flow/work-packet.md\` for the current task goal, scope, plan, and verification approach.
4. Read \`.flow/state/handoff.md\` for the previous session progress, risks, and next step.
5. Look in \`.flow/docs/\` for requirements, analysis, and plan documents.
6. Look in \`.flow/attachments/\` for product prototypes, external requirement documents, and other attachments.
7. Do not mark work complete without verification evidence.

## Work Rules

- Only one task may be \`active\` at a time.
- Do not mark a task complete just because the code has been written.
- Only make narrow bypass fixes when they are required to remove the current blocker.
- Do not weaken verification rules to make the result look passing.
- Prefer persistent files in the repository as the source of truth; do not rely on chat history as fact.
- Do not opportunistically refactor other modules unless the current task explicitly requires it.
- If unexplained workspace changes already exist, decide whether they conflict with the current task; if they conflict, pause and record the issue in \`.flow/state/handoff.md\`.
- When changing code, add concise Chinese comments to key classes, methods, complex logic, and SQL; do not comment every line.
- Do not commit code unless the user explicitly asks.
- If this session writes a proposal or document first, stop after the document and wait for user approval before writing code.

## Document Locations

- \`.flow/docs/\`: AI-generated requirements, analysis, plan documents, and task summaries.
- \`.flow/attachments/\`: Product manager inputs, prototypes, external requirement documents, screenshots, and reference files.

## Session End

1. Run \`flow check\`.
2. Run \`flow finish\`.
3. Update \`.flow/work-packet.md\`: current progress, plan changes, and verification changes.
4. Update \`.flow/state/tasks.yaml\`: maintain the current task \`status\`, \`verification\`, \`evidence\`, and \`notes\`.
5. Only mark a task as \`passing\` after the target behavior is complete and verification evidence has been written to \`evidence\`.
6. If unresolved blockers remain, keep or mark the task as \`blocked\` and explain the reason in \`notes\` or \`evidence\`.
7. Update \`.flow/state/handoff.md\`: completed work, unfinished work, risks, and next step.
8. Put newly generated requirements, analysis, and plan documents in \`.flow/docs/\`.
9. Do not overwrite external source material in \`.flow/attachments/\`.
`,
    adopt: `# {{projectName}} AI Flow Entry

This existing project is adopted by dcflow.

## Session Start

1. Run \`flow status\` to inspect current flow state.
2. Read \`.flow/state/tasks.yaml\` to confirm the single active task.
3. Read \`.flow/work-packet.md\` for the current task goal, scope, plan, and verification approach.
4. Read \`.flow/state/handoff.md\` for the previous session progress, risks, and next step.
5. Look in \`.flow/docs/\` for requirements, analysis, and plan documents.
6. Look in \`.flow/attachments/\` for product prototypes, external requirement documents, and other attachments.
7. Work only on the active task unless the user changes scope.

## Work Rules

- Only one task may be \`active\` at a time.
- Do not mark a task complete just because the code has been written.
- Only make narrow bypass fixes when they are required to remove the current blocker.
- Do not weaken verification rules to make the result look passing.
- Prefer persistent files in the repository as the source of truth; do not rely on chat history as fact.
- Do not opportunistically refactor other modules unless the current task explicitly requires it.
- If unexplained workspace changes already exist, decide whether they conflict with the current task; if they conflict, pause and record the issue in \`.flow/state/handoff.md\`.
- When changing code, add concise Chinese comments to key classes, methods, complex logic, and SQL; do not comment every line.
- Do not commit code unless the user explicitly asks.
- If this session writes a proposal or document first, stop after the document and wait for user approval before writing code.

## Document Locations

- \`.flow/docs/\`: AI-generated requirements, analysis, plan documents, and task summaries.
- \`.flow/attachments/\`: Product manager inputs, prototypes, external requirement documents, screenshots, and reference files.

## Session End

1. Run \`flow check\`.
2. Run \`flow finish\`.
3. Update \`.flow/work-packet.md\`: current progress, plan changes, and verification changes.
4. Update \`.flow/state/tasks.yaml\`: maintain the current task \`status\`, \`verification\`, \`evidence\`, and \`notes\`.
5. Only mark a task as \`passing\` after the target behavior is complete and verification evidence has been written to \`evidence\`.
6. If unresolved blockers remain, keep or mark the task as \`blocked\` and explain the reason in \`notes\` or \`evidence\`.
7. Update \`.flow/state/handoff.md\`: completed work, unfinished work, risks, and next step.
8. Put newly generated requirements, analysis, and plan documents in \`.flow/docs/\`.
9. Do not overwrite external source material in \`.flow/attachments/\`.
`,
  },
  workspaceDocs: {
    docsReadme: `# Flow Docs

Use this directory for documents generated by AI during development, such as:

- requirements notes
- code analysis documents
- plan documents
- technical proposals and task summaries

Conventions:

- Put newly generated requirements, analysis, and planning documents here first.
- Prefer filenames that include a date or task id so future sessions can find the context.
`,
    attachmentsReadme: `# Flow Attachments

Use this directory for attachments from product managers, business owners, or external sources, such as:

- prototypes
- external requirement documents
- screenshots and design files
- API notes, spreadsheets, and other reference files

Conventions:

- Preserve attachments as source material; do not overwrite them casually.
- Agents should check this directory when they need to understand product requirements.
`,
  },
  workPacket: `# Current Task Work Packet

Project: {{projectName}}
Current flow: {{flowName}}

This file is not a temporary cache of \`flow start\` output. It is the maintainable context for the current task, maintained by agents and programmers after initialization.

## Current Task

- active task: not selected yet
- task goal: to be filled
- scope boundaries: to be filled
- verification approach: to be filled

## Related Material

- task state: \`.flow/state/tasks.yaml\`
- session handoff: \`.flow/state/handoff.md\`
- AI-generated docs: \`.flow/docs/\`
- external attachments: \`.flow/attachments/\`

## Execution Plan

- To be filled by an agent or programmer.

## Progress Log

- To be updated by an agent or programmer before each session ends.

## Maintenance Rules

- Read this file at session start, then read \`.flow/state/handoff.md\`.
- Update this file when the task goal, scope, plan, or verification approach changes.
- At session end, sync completed work, risks, and the next step into \`.flow/state/handoff.md\`.
- Put newly generated requirements, analysis, and plan documents in \`.flow/docs/\`.
- \`.flow/attachments/\` contains external source material; do not overwrite it unless the user explicitly asks.
`,
  adoptionReport: (options) => [
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
    '## Conflict Template Copies',
    '',
    ...formatConflictCopies(options.conflicts, 'No template conflicts need manual merging.'),
    '',
    '## Generated Checks',
    '',
    ...options.checks.map((check) => `- ${check.command} (${check.name}, required: ${check.required})`),
    '',
    '## Notes',
    '',
    '- Existing AI entry files were not overwritten.',
    '- If conflict template copies were generated, compare them with the original files and manually merge the rules you want.',
    '- Review `.flow/checks/default.yaml` before relying on `dcflow finish`.',
    '- Add a task with `dcflow task add "task title"` and activate it with `dcflow task active <task-id>`.',
    '',
  ].join('\n'),
  start: {
    title: '# dcflow Work Packet',
    project: 'Project',
    validation: 'Validation',
    activeTask: '## Active Task',
    taskTitle: 'title',
    taskStatus: 'status',
    taskPriority: 'priority',
    verification: 'verification',
    evidence: 'evidence',
    notes: 'notes',
    none: 'none',
    emptyBlock: 'empty',
    checks: '## Checks',
    handoff: '## Handoff',
    validationErrors: 'Validation errors:',
  },
  flowStrategies: {
    harness: {
      title: 'Harness',
      rules: [
        'Blueprint: read and preserve the project architecture intent before editing.',
        'Spec: follow the project rule pool before choosing implementation style.',
        'Task State: work only on the active task unless the user explicitly changes scope.',
        'Quality Gate: run configured checks before claiming completion.',
        'Finish: capture reusable lessons so the flow can improve after the task.',
      ],
    },
    loop: {
      title: 'Loop',
      rules: [
        'Observe: inspect current state, evidence, and constraints before acting.',
        'Plan: choose the smallest next loop step and state the expected outcome.',
        'Act: make focused changes only for the active task.',
        'Verify: run configured checks and compare the result with the plan.',
        'Reflect: record what changed, what failed, and what the next loop should do.',
      ],
    },
  },
};

function formatListInline(values: string[]): string {
  return values.length === 0 ? 'none' : values.join(', ');
}

function formatListBlock(values: string[]): string[] {
  return values.length === 0 ? ['- none'] : values.map((value) => `- ${value}`);
}

function formatConflictCopies(
  conflicts: Array<{ originalPath: string; templateCopyPath: string }> | undefined,
  emptyLabel: string,
): string[] {
  if (!conflicts || conflicts.length === 0) {
    return [`- ${emptyLabel}`];
  }

  return conflicts.map(
    (conflict) => `- ${conflict.originalPath}: template copy ${conflict.templateCopyPath}`,
  );
}
