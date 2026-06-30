# dcflow

dcflow 是一个面向 AI 辅助开发的 Flow Runtime CLI，目标是把 Harness、Loop 等 AI 驾驭工程沉淀为可切换、可恢复、可验证的项目级工作流。

它通过项目内的 `.flow` 目录持久化配置、任务状态、校验规则和交接信息，让 Claude、Codex、Cursor 等 AI 编程工具在不同会话中共享明确上下文，降低重复说明背景、任务遗忘、流程失控和代码质量不可控的问题。

> Current status: early MVP, Plan 8 completed.

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
- `start`: 根据 active 任务生成 AI 工作包。
- `check`: 执行 `.flow/checks/default.yaml` 中配置的本地校验命令。
- `finish`: 运行校验、记录验证证据、更新 handoff，并推进任务状态。
- `adopt`: 安全接入已有项目，生成 `.flow` 和 adoption report，不覆盖已有 AI 入口文件。
- `switch`: 切换当前 flow strategy，目前支持 `harness` 和 `loop`。
- `.flow` schema validation: 校验配置、任务和检查文件。
- `dcflow` / `flow` 两个 bin 名称预留。

还未实现：

- Flow strategy 行为差异：让 `start` 根据 Harness / Loop 输出不同工作规则。

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

生成文件：

```text
.flow/config.yaml
.flow/state/tasks.yaml
.flow/state/handoff.md
.flow/checks/default.yaml
AGENTS.md
CLAUDE.md
```

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
# dcflow Work Packet

Project: my-flow-test
Flow: harness
Validation: ok

## Active Task
- id: task-20260629-170050
- title: 实现登录接口
- status: active
- priority: 0

## Flow Rules
- Work only on the active task unless the user explicitly changes scope.
- Keep changes scoped and consistent with the existing project style.
- Run the configured checks before claiming completion.
- Record blockers, risks, and verification evidence before finishing.
```

`start` 是只读命令，不会修改 `.flow` 状态。它适合在打开 Claude、Codex、Cursor 等 AI 工具前运行，然后把输出复制给 AI。

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
Existing AI files: AGENTS.md
```

`adopt` 面向老项目，默认只创建缺失文件，不覆盖已有 `AGENTS.md`、`CLAUDE.md` 或 `.cursorrules`。它会扫描项目类型和已有 AI 入口文件，生成 `.flow/adoption-report.md`，并尽量根据 `package.json` scripts 或 `pom.xml` 推断默认校验命令。

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

## `.flow` Structure

```text
.flow/
  config.yaml
  adoption-report.md
  checks/
    default.yaml
  state/
    tasks.yaml
    handoff.md
```

### config.yaml

保存项目名、当前 flow 和启用的 AI 工具适配器：

```yaml
project:
  name: my-flow-test
flow:
  current: harness
adapters:
  enabled:
    - claude
    - codex
```

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

### checks/default.yaml

保存 `check` 命令会使用的本地校验配置：

```yaml
checks:
  - name: placeholder check
    command: node --version
    cwd: .
    required: true
```

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

## Roadmap

- Plan 4: `start` 生成当前 AI 工作包。Done.
- Plan 5: `check` 执行 `.flow/checks/default.yaml` 中的校验命令。Done.
- Plan 6: `finish` 记录证据、更新 handoff、推进任务状态。Done.
- Plan 7: `adopt` 接入已有项目。Done.
- Plan 8: `switch` 切换 Harness / Loop / 新 flow strategy。Done.
