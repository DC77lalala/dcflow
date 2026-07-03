# dcflow

dcflow 是一个面向 AI 辅助开发的 Flow Runtime CLI，目标是把 Harness、Loop 等 AI 驾驭工程沉淀为可切换、可恢复、可验证的项目级工作流。

它通过项目内的 `.flow` 目录持久化配置、任务状态、校验规则和交接信息，让 Claude、Codex、Cursor 等 AI 编程工具在不同会话中共享明确上下文，降低重复说明背景、任务遗忘、流程失控和代码质量不可控的问题。

> Current status: early MVP, Plan 10 completed.

## Why

AI 编程工具在长任务里常见的问题是：

- 新会话不知道当前做到哪一步。
- AI 会重复阅读大量低信噪比源码。
- 任务没有明确的 active 状态。
- 缺少统一的本地校验入口。
- Harness、Loop 或未来新的流程范式难以切换。

dcflow 的思路是把这些上下文变成项目里的可读文件和 CLI 命令，而不是只存在聊天记录里。

## Features

当前已经实现：

- `init`: 初始化 `.flow` 工作区和 AI 入口文件。
- `task add`: 新增任务。
- `task list`: 查看任务列表。
- `task active`: 选择当前 active 任务。
- `status`: 查看项目 flow、任务数量、active 任务和 schema 校验结果。
- `start`: 根据 active 任务和当前 flow strategy 生成 AI 工作包。
- `check`: 执行 `.flow/checks/default.yaml` 中配置的本地校验命令。
- `finish`: 运行校验、记录验证证据、更新 handoff，并推进任务状态。
- `adopt`: 安全接入已有项目，生成 `.flow` 和 adoption report，不覆盖已有 AI 入口文件。
- `switch`: 切换当前 flow strategy，目前支持 `harness` 和 `loop`。
- `language`: 模板集中管理，`init` / `adopt` 支持 `zh-CN` 和 `en-US`，默认中文。
- `.flow` schema validation: 校验配置、任务和检查文件。
- `dcflow` / `flow` 两个 bin 名称预留。

还未实现：

- Flow strategy 插件化：让未来新增 strategy 不需要改核心代码。

## Requirements

- Node.js >= 18
- pnpm 11.x

## Development

```powershell
cd D:\code\dc_code\dcflow
pnpm install
pnpm test
pnpm build
```

常用命令：

```powershell
pnpm test
pnpm build
node dist\index.js --help
```

## Usage

当前还没有发布到 npm，所以本地测试时需要通过构建后的入口文件运行：

```powershell
node D:\code\dc_code\dcflow\dist\index.js <command>
```

### 1. 初始化项目

进入一个目标项目目录：

```powershell
cd D:\code\dc_code\my-flow-test
node D:\code\dc_code\dcflow\dist\index.js init --yes --project-name my-flow-test
```

默认会生成中文模板，并在 `.flow/config.yaml` 中写入 `language: zh-CN`。如果要生成英文模板：

```powershell
node D:\code\dc_code\dcflow\dist\index.js init --yes --project-name my-flow-test --language en-US
```

生成文件：

```text
.flow/config.yaml
.flow/state/tasks.yaml
.flow/state/handoff.md
.flow/work-packet.md
.flow/checks/default.yaml
.flow/docs/README.md
.flow/attachments/README.md
AGENTS.md
CLAUDE.md
```

如果目标项目已经有 `AGENTS.md` 或 `CLAUDE.md`，`init` 不会覆盖原文件，而是生成 `.flow/conflicts/<timestamp>-<file>.dcflow-template.md` 作为当前模板副本，并在输出中提示 `conflict` 路径，方便手动合并。

如果目标项目已经有 `.flow/state/tasks.yaml` 等 `.flow` 状态文件，`init` 会在写入前停止，避免留下半初始化状态。已有项目更推荐使用 `adopt`。

### 2. 新增任务

```powershell
node D:\code\dc_code\dcflow\dist\index.js task add "实现登录接口"
```

示例输出：

```text
added task-20260629-170050: 实现登录接口
```

### 3. 查看任务

```powershell
node D:\code\dc_code\dcflow\dist\index.js task list
```

示例输出：

```text
- task-20260629-170050 [not_started] P0 实现登录接口
```

### 4. 激活任务

```powershell
node D:\code\dc_code\dcflow\dist\index.js task active task-20260629-170050
```

示例输出：

```text
active task-20260629-170050: 实现登录接口
```

同一时间只允许一个 active 任务。激活新任务时，旧 active 任务会回到 `not_started`。

### 5. 查看状态

```powershell
node D:\code\dc_code\dcflow\dist\index.js status
```

示例输出：

```text
Project: my-flow-test
Flow: harness
Tasks: 1
Active task: task-20260629-170050 实现登录接口
Validation: ok
```

### 6. 生成 AI 工作包

```powershell
node D:\code\dc_code\dcflow\dist\index.js start
```

示例输出片段：

```text
# dcflow 工作包

项目: my-flow-test
Flow: harness
校验: ok

## 当前任务
- id: task-20260629-170050
- 标题: 实现登录接口
- 状态: active
- 优先级: 0

## Flow Rules: Harness
- Blueprint：修改前先读取并保持项目架构意图。
- Spec：先遵守项目规范池，再选择实现方式。
- Task State：除非用户明确变更范围，否则只处理 active 任务。
- Quality Gate：声明完成前必须运行配置的检查。
- Finish：沉淀可复用经验，让 flow 随任务持续改进。
```

`start` 是只读命令，不会修改 `.flow` 状态。它适合在打开 Claude、Codex、Cursor 等 AI 工具前运行，然后把输出复制给 AI。当前 `flow.current` 为 `harness` 时会输出 Harness 规则；切换为 `loop` 后会输出 Observe / Plan / Act / Verify / Reflect 规则。输出语言由 `.flow/config.yaml` 里的 `language` 决定。

### 7. 运行校验

```powershell
node D:\code\dc_code\dcflow\dist\index.js check
```

示例输出：

```text
Running checks...

PASS placeholder check
command: node --version
cwd: .
required: true
exitCode: 0
stdout:
  v22.16.0

Summary: 1 passed, 0 failed
```

`check` 会顺序执行 `.flow/checks/default.yaml` 中的检查。`required: true` 的检查失败时，命令整体失败；`required: false` 的检查失败只会被记录在输出里。

### 8. 收尾任务

```powershell
node D:\code\dc_code\dcflow\dist\index.js finish
```

示例输出：

```text
Finishing active task...
Task: task-20260629-170050 实现登录接口
Result: passing
Checks: 1 passed, 0 failed
Updated .flow/state/tasks.yaml
Updated .flow/state/handoff.md
```

`finish` 会复用 `.flow/checks/default.yaml` 中的校验配置。所有 required 检查通过时，active 任务会变成 `passing`；如果 required 检查失败，任务会变成 `blocked`，命令退出码为 1。两种情况都会把校验证据写入 `.flow/state/tasks.yaml`，并刷新 `.flow/state/handoff.md`，方便下一次 AI 会话直接接上。

### 9. 接入已有项目

进入一个已有项目目录：

```powershell
cd D:\code\your-existing-project
node D:\code\dc_code\dcflow\dist\index.js adopt
```

默认会生成中文接入模板。需要英文模板时加 `--language en-US`：

```powershell
node D:\code\dc_code\dcflow\dist\index.js adopt --language en-US
```

示例输出：

```text
dcflow adopted legacy-node-app
Detected: node
Report: .flow/adoption-report.md
Created: .flow/config.yaml
Created: .flow/state/tasks.yaml
Created: .flow/state/handoff.md
Created: .flow/checks/default.yaml
Created: .flow/adoption-report.md
Skipped: AGENTS.md
Conflict: AGENTS.md -> template copy .flow/conflicts/20260703-102030-AGENTS.dcflow-template.md
Existing AI files: AGENTS.md
```

`adopt` 面向老项目，默认只创建缺失文件，不覆盖已有 `AGENTS.md`、`CLAUDE.md` 或 `.cursorrules`。它会扫描项目类型和已有 AI 入口文件，生成 `.flow/adoption-report.md`，并尽量根据 `package.json` scripts 或 `pom.xml` 推断默认校验命令。

如果已有 `AGENTS.md` 或 `CLAUDE.md` 与当前模板存在合并风险，`adopt` 不会修改原文件，而是把当前模板写入 `.flow/conflicts/<timestamp>-<file>.dcflow-template.md`，并在命令输出和 adoption report 中提示路径。用户需要手动对比原文件和模板副本后合并需要的规则。

### 10. 切换 Flow Strategy

```powershell
node D:\code\dc_code\dcflow\dist\index.js switch loop
```

示例输出：

```text
Flow switched: harness -> loop
Updated .flow/config.yaml
```

当前支持的 strategy：

- `harness`
- `loop`

`switch` 只修改 `.flow/config.yaml` 里的 `flow.current`，不会改任务、checks 或 handoff。未知 strategy 会直接报错，避免把不可识别的状态写进配置。

切换后再次运行 `start`，AI 工作包里的 `Flow Rules` 会跟随当前 strategy 改变。

## `.flow` Structure

```text
.flow/
  config.yaml
  adoption-report.md
  work-packet.md
  conflicts/
    20260703-102030-AGENTS.dcflow-template.md
  docs/
    README.md
  attachments/
    README.md
  checks/
    default.yaml
  state/
    tasks.yaml
    handoff.md
```

### config.yaml

保存项目名、当前 flow、模板语言和启用的 AI 工具适配器：

```yaml
project:
  name: my-flow-test
flow:
  current: harness
language: zh-CN
adapters:
  enabled:
    - claude
    - codex
```

`language` 当前支持 `zh-CN` 和 `en-US`。它会影响 `init` / `adopt` 生成的模板，以及 `start` 输出的 AI 工作包。

### AGENTS.md / CLAUDE.md Work Rules

`init` 和 `adopt` 会生成 AI 入口文档，里面包含统一的 `Work Rules`：

- 一次只允许一个任务处于 `active` 状态。
- 不因为代码已经写了就把任务标记为完成。
- 不为通过结果而弱化验证规则。
- 优先依赖仓库持久化文件，不依赖聊天记录作为事实来源。
- 除非当前任务明确要求，否则不顺手重构其他模块。
- 工作区已有未说明改动时，先判断是否冲突；冲突时暂停并记录到 handoff。
- 修改代码时，在关键类、方法、复杂逻辑和 SQL 上补充简洁中文注释。
- 不自行提交代码，除非用户明确要求。
- 如果本轮先写方案或文档，写完后等待用户确认，再开始写代码。

老项目里如果已经存在 `AGENTS.md` 或 `CLAUDE.md`，`adopt` 会保留原文件，并在 `.flow/conflicts/` 生成带时间戳的模板副本，方便人工合并新规则。

### work-packet.md

当前任务的可维护工作包。它不是 `flow start` 的临时输出缓存，而是初始化后由 agent 和程序员共同维护的上下文文件。

建议用途：

- 记录当前 active 任务目标、范围边界、执行计划和验证方式。
- 会话开始时先读 `.flow/work-packet.md`，再读 `.flow/state/handoff.md`。
- 如果任务目标、范围、计划或验证方式发生变化，agent 应更新本文件。
- 会话结束时，agent 应同步更新 `.flow/state/tasks.yaml` 中当前任务的 `status`、`verification`、`evidence` 和 `notes`。
- 会话结束时，把本轮完成内容、风险和下一步同步到 `.flow/state/handoff.md`。

### tasks.yaml

保存任务池和当前任务状态：

```yaml
tasks:
  - id: task-20260629-170050
    title: 实现登录接口
    status: active
    priority: 0
    verification: []
    evidence: []
```

任务状态当前支持：

- `not_started`
- `active`
- `blocked`
- `passing`

建议维护规则：

- `verification`: 记录任务需要执行或已经约定的验证方式。
- `evidence`: 记录实际执行过的验证命令、结果和关键证据。
- `notes`: 记录进度、风险、阻塞原因或下一步补充信息。
- 只有目标完成且 `evidence` 已写入验证证据时，才把任务标记为 `passing`。
- 如果存在未解决阻塞，保持或标记为 `blocked`，并在 `notes` 或 `evidence` 说明原因。

### checks/default.yaml

保存 `check` 命令会使用的本地校验配置：

```yaml
checks:
  - name: placeholder check
    command: node --version
    cwd: .
    required: true
```

### docs/

存放 AI 生成的需求文档、分析文档、Plan 文档、技术方案和任务总结。生成的 `AGENTS.md` / `CLAUDE.md` 会提示 agent 优先在这里查找或沉淀项目文档。

### attachments/

存放产品经理、业务方或外部输入提供的原型图、需求文档、截图、设计稿和其他参考附件。生成的 `AGENTS.md` / `CLAUDE.md` 会提示 agent 需要理解需求时先检查这里。

### adoption-report.md

`adopt` 生成的接入报告，记录识别到的项目类型、已有 AI 入口文件、生成的 checks 和后续建议。

## Project Layout

```text
src/
  cli.ts                 CLI command registration
  index.ts               executable entry
  commands/              command-level behavior
  core/                  reusable flow logic
  schemas/               zod schemas for .flow files
  templates/             zh-CN and en-US generated content
tests/
  fixtures/              valid and invalid .flow examples
  unit/                  unit tests
docs/
  execution-log.md       implementation progress log
```

## Design Notes

dcflow 现在优先保证三个基础能力：

1. Recoverable: 任务状态写入 `.flow/state/tasks.yaml`，不会只留在聊天上下文里。
2. Verifiable: `.flow` 文件会经过 schema 校验，避免坏状态继续扩散。
3. Switchable: 配置中保留 `flow.current`，为 Harness、Loop 和未来 flow strategy 切换留出结构。
4. Localizable: 模板内容集中在 `src/templates`，避免命令实现里散落中英文文案。
5. Documented: `.flow/docs` 和 `.flow/attachments` 为 AI 生成文档与外部需求资料提供固定入口。
6. Maintainable: `.flow/work-packet.md` 由 agent 和程序员维护，用于沉淀当前任务目标、计划和验证方式。

## Roadmap

- Plan 4: `start` 生成当前 AI 工作包。Done.
- Plan 5: `check` 执行 `.flow/checks/default.yaml` 中的校验命令。Done.
- Plan 6: `finish` 记录证据、更新 handoff、推进任务状态。Done.
- Plan 7: `adopt` 接入已有项目。Done.
- Plan 8: `switch` 切换 Harness / Loop / 新 flow strategy。Done.
- Plan 9: `start` 根据 Harness / Loop 输出不同工作规则。Done.
- Plan 10: 模板集中管理，支持中文 / 英文生成。Done.
- Plan 11: `.flow` 文档与附件目录约定。Done.
- Plan 12: 初始化可维护 `.flow/work-packet.md`。Done.
