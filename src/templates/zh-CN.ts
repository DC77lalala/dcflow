import { type LanguageTemplates } from './types.js';

export const zhCnTemplates: LanguageTemplates = {
  language: 'zh-CN',
  handoff: {
    init: `# Flow 交接

项目: {{projectName}}
当前 flow: {{flowName}}

## 当前状态

- 还没有创建 active 任务。
- 运行 \`dcflow task add "任务标题"\` 创建第一个任务。
- 运行 \`dcflow task active <task-id>\` 选择当前任务。

## 下一步

- 选择 active 任务后，运行 \`dcflow start\` 生成 AI 工作包。
`,
    adopt: `# Flow 交接

项目: {{projectName}}
当前 flow: {{flowName}}

## 当前状态

- 已将现有项目接入 dcflow。
- 还没有创建 active 任务。
- 第一次 AI 会话前先阅读 .flow/adoption-report.md。

## 下一步

- 运行 \`dcflow task add "任务标题"\` 创建第一个纳入追踪的任务。
- 运行 \`dcflow task active <task-id>\` 选择当前任务。
- 运行 \`dcflow start\` 生成 AI 工作包。
`,
    activeTask: `# Flow 交接

项目: {{projectName}}
当前 flow: {{flowName}}

## 当前任务

- id: {{taskId}}
- 标题: {{taskTitle}}
- 状态: {{taskStatus}}
- 优先级: {{taskPriority}}

## 下一步

- 运行 \`dcflow start\` 生成 AI 工作包。
- 只围绕当前 active 任务推进，除非用户明确变更范围。
`,
  },
  agents: {
    init: `# {{projectName}} AI Flow 入口

本项目使用 dcflow 管理 AI 辅助开发流程。

## 会话开始

1. 读取 \`.flow/config.yaml\`，确认当前 flow。
2. 读取 \`.flow/state/tasks.yaml\`，确认唯一 active 任务。
3. 读取 \`.flow/work-packet.md\`，了解当前任务目标、范围、计划和验证方式。
4. 读取 \`.flow/state/handoff.md\`，了解上次会话进度、风险和下一步。
5. 需要需求、分析或计划文档时，优先查看 \`.flow/docs/\`。
6. 需要产品原型、外部需求文档或其他附件时，优先查看 \`.flow/attachments/\`。
7. 没有验证证据时，不要声明任务完成。

## Work Rules

- 一次只允许一个任务处于 \`active\` 状态。
- 不要因为代码已经写了就把任务标记为完成。
- 只有在消除当前 blocker 所必需时，才允许做窄范围旁路修复。
- 不要为了让结果看起来通过而弱化验证规则。
- 优先依赖仓库中的持久化文件，不要依赖聊天记录作为事实来源。
- 除非当前任务明确要求，否则不要顺手重构其他模块。
- 如果发现工作区已有未说明改动，先判断是否与当前任务冲突；冲突时暂停并记录到 \`.flow/state/handoff.md\`。
- 修改代码时，在关键类、方法、复杂逻辑和 SQL 上补充中文注释；注释要简洁、通俗，不要求每行都写。
- 不要自行提交代码，除非用户明确要求。
- 如果本轮先写方案或文档，写完后暂停，等用户确认后再开始写代码。

## 文档位置

- \`.flow/docs/\`: 存放 AI 生成的需求文档、分析文档、Plan 文档和任务总结。
- \`.flow/attachments/\`: 存放产品经理或外部输入提供的原型图、需求文档和参考附件。

## 会话结束

1. 运行 \`flow check\`。
2. 运行 \`flow finish\`。
3. 更新 \`.flow/work-packet.md\`：当前任务进展、计划变化、验证方式变化。
4. 更新 \`.flow/state/tasks.yaml\`：维护当前任务的 \`status\`、\`verification\`、\`evidence\` 和 \`notes\`。
5. 只有目标完成且验证证据已写入 \`evidence\` 时，才允许把任务标记为 \`passing\`。
6. 如果存在未解决阻塞，保持或标记为 \`blocked\`，并在 \`notes\` 或 \`evidence\` 说明原因。
7. 更新 \`.flow/state/handoff.md\`：本轮完成内容、未完成内容、风险和下一步。
8. 新生成的需求、分析、Plan 文档放入 \`.flow/docs/\`。
9. 不覆盖 \`.flow/attachments/\` 中的外部资料。
`,
    adopt: `# {{projectName}} AI Flow 入口

本项目已接入 dcflow。

## 会话开始

1. 运行 \`flow status\` 查看当前 flow 状态。
2. 读取 \`.flow/state/tasks.yaml\`，确认唯一 active 任务。
3. 读取 \`.flow/work-packet.md\`，了解当前任务目标、范围、计划和验证方式。
4. 读取 \`.flow/state/handoff.md\`，了解上次会话进度、风险和下一步。
5. 需要需求、分析或计划文档时，优先查看 \`.flow/docs/\`。
6. 需要产品原型、外部需求文档或其他附件时，优先查看 \`.flow/attachments/\`。
7. 除非用户明确变更范围，否则只处理 active 任务。

## Work Rules

- 一次只允许一个任务处于 \`active\` 状态。
- 不要因为代码已经写了就把任务标记为完成。
- 只有在消除当前 blocker 所必需时，才允许做窄范围旁路修复。
- 不要为了让结果看起来通过而弱化验证规则。
- 优先依赖仓库中的持久化文件，不要依赖聊天记录作为事实来源。
- 除非当前任务明确要求，否则不要顺手重构其他模块。
- 如果发现工作区已有未说明改动，先判断是否与当前任务冲突；冲突时暂停并记录到 \`.flow/state/handoff.md\`。
- 修改代码时，在关键类、方法、复杂逻辑和 SQL 上补充中文注释；注释要简洁、通俗，不要求每行都写。
- 不要自行提交代码，除非用户明确要求。
- 如果本轮先写方案或文档，写完后暂停，等用户确认后再开始写代码。

## 文档位置

- \`.flow/docs/\`: 存放 AI 生成的需求文档、分析文档、Plan 文档和任务总结。
- \`.flow/attachments/\`: 存放产品经理或外部输入提供的原型图、需求文档和参考附件。

## 会话结束

1. 运行 \`flow check\`。
2. 运行 \`flow finish\`。
3. 更新 \`.flow/work-packet.md\`：当前任务进展、计划变化、验证方式变化。
4. 更新 \`.flow/state/tasks.yaml\`：维护当前任务的 \`status\`、\`verification\`、\`evidence\` 和 \`notes\`。
5. 只有目标完成且验证证据已写入 \`evidence\` 时，才允许把任务标记为 \`passing\`。
6. 如果存在未解决阻塞，保持或标记为 \`blocked\`，并在 \`notes\` 或 \`evidence\` 说明原因。
7. 更新 \`.flow/state/handoff.md\`：本轮完成内容、未完成内容、风险和下一步。
8. 新生成的需求、分析、Plan 文档放入 \`.flow/docs/\`。
9. 不覆盖 \`.flow/attachments/\` 中的外部资料。
`,
  },
  workspaceDocs: {
    docsReadme: `# Flow 文档目录

这里用于存放 AI 在开发过程中生成的文档，例如：

- 需求梳理文档
- 代码分析文档
- Plan 文档
- 技术方案和任务总结

约定：

- 新生成的需求、分析、计划类文档优先放在这里。
- 文件名尽量包含日期或任务 id，方便跨会话追踪。
`,
    attachmentsReadme: `# Flow 附件目录

这里用于存放产品经理、业务方或外部来源提供的附件，例如：

- 原型图
- 外部需求文档
- 截图和设计稿
- 接口说明、表格或其他参考资料

约定：

- 附件保持原始内容，不要让 AI 随意覆盖。
- AI 需要理解需求时，应先检查这个目录是否有相关资料。
`,
  },
  workPacket: `# 当前任务工作包

项目: {{projectName}}
当前 flow: {{flowName}}

这个文件不是 \`flow start\` 的临时输出缓存，而是当前任务的可维护上下文。初始化后由 agent 和程序员维护。

## 当前任务

- active task: 暂未选择
- 任务目标: 待补充
- 范围边界: 待补充
- 验证方式: 待补充

## 相关资料

- 任务状态: \`.flow/state/tasks.yaml\`
- 会话交接: \`.flow/state/handoff.md\`
- AI 生成文档: \`.flow/docs/\`
- 外部需求附件: \`.flow/attachments/\`

## 执行计划

- 待 agent 或程序员补充。

## 进度记录

- 待 agent 或程序员在每次会话结束前更新。

## 维护规则

- 会话开始先读本文件，再读 \`.flow/state/handoff.md\`。
- 如果任务目标、范围、计划或验证方式发生变化，更新本文件。
- 会话结束时，把本轮完成内容、风险和下一步同步到 \`.flow/state/handoff.md\`。
- 新生成的需求、分析、Plan 文档放入 \`.flow/docs/\`。
- \`.flow/attachments/\` 是外部输入资料，除非用户明确要求，不要覆盖。
`,
  adoptionReport: (options) => [
    '# dcflow 接入报告',
    '',
    '## 项目',
    '',
    `- 项目: ${options.projectName}`,
    `- 识别类型: ${options.detection.type}`,
    `- 识别信号: ${formatListInline(options.detection.signals)}`,
    '',
    '## 已有 AI 入口文件',
    '',
    ...formatListBlock(options.foundAiFiles),
    '',
    '## 冲突模板副本',
    '',
    ...formatConflictCopies(options.conflicts, '未发现需要人工合并的模板冲突。'),
    '',
    '## 生成的检查命令',
    '',
    ...options.checks.map((check) => `- ${check.command} (${check.name}, required: ${check.required})`),
    '',
    '## 备注',
    '',
    '- 已有 AI 入口文件不会被覆盖。',
    '- 如果生成了冲突模板副本，请手动对比原文件和副本后合并需要的规则。',
    '- 在依赖 `dcflow finish` 前，请先检查 `.flow/checks/default.yaml`。',
    '- 使用 `dcflow task add "任务标题"` 创建任务，再使用 `dcflow task active <task-id>` 激活任务。',
    '',
  ].join('\n'),
  start: {
    title: '# dcflow 工作包',
    project: '项目',
    validation: '校验',
    activeTask: '## 当前任务',
    taskTitle: '标题',
    taskStatus: '状态',
    taskPriority: '优先级',
    verification: '验证要求',
    evidence: '证据',
    notes: '备注',
    none: '无',
    emptyBlock: '空',
    checks: '## 校验命令',
    handoff: '## 交接信息',
    validationErrors: '校验错误:',
  },
  flowStrategies: {
    harness: {
      title: 'Harness',
      rules: [
        'Blueprint：修改前先读取并保持项目架构意图。',
        'Spec：先遵守项目规范池，再选择实现方式。',
        'Task State：除非用户明确变更范围，否则只处理 active 任务。',
        'Quality Gate：声明完成前必须运行配置的检查。',
        'Finish：沉淀可复用经验，让 flow 随任务持续改进。',
      ],
    },
    loop: {
      title: 'Loop',
      rules: [
        'Observe：行动前先观察当前状态、证据和约束。',
        'Plan：选择最小下一步，并说明预期结果。',
        'Act：只围绕 active 任务做聚焦修改。',
        'Verify：运行配置的检查，并对照计划判断结果。',
        'Reflect：记录变更、失败点和下一轮 loop 应做什么。',
      ],
    },
  },
};

function formatListInline(values: string[]): string {
  return values.length === 0 ? '无' : values.join(', ');
}

function formatListBlock(values: string[]): string[] {
  return values.length === 0 ? ['- 无'] : values.map((value) => `- ${value}`);
}

function formatConflictCopies(
  conflicts: Array<{ originalPath: string; templateCopyPath: string }> | undefined,
  emptyLabel: string,
): string[] {
  if (!conflicts || conflicts.length === 0) {
    return [`- ${emptyLabel}`];
  }

  return conflicts.map(
    (conflict) => `- ${conflict.originalPath}: 模板副本 ${conflict.templateCopyPath}`,
  );
}
