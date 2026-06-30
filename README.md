# dcflow

dcflow 是一个面向 AI 辅助开发的 Flow Runtime CLI，目标是把 Harness、Loop 等 AI 驾驭工程沉淀为可切换、可恢复、可验证的项目级工作流。

它通过项目内的 `.flow` 目录持久化配置、任务状态、校验规则和交接信息，让 Claude、Codex、Cursor 等 AI 编程工具在不同会话中共享明确上下文，降低重复说明背景、任务遗忘、流程失控和代码质量不可控的问题。

> Current status: early MVP, Plan 4.

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
- `.flow` schema validation: 校验配置、任务和检查文件。
- `dcflow` / `flow` 两个 bin 名称预留。

还未实现：

- `check`: 运行项目校验命令。
- `finish`: 记录验证证据并推进任务状态。
- `switch`: 切换 Harness / Loop / 未来 flow strategy。
- `adopt`: 接入已有项目并迁移现有 AI 规范文件。

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

## `.flow` Structure

```text
.flow/
  config.yaml
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

保存后续 `check` 命令会使用的本地校验配置。当前 Plan 4 还没有实现 `check`，但 `start` 会把这些检查项放进 AI 工作包。

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
- Plan 5: `check` 执行 `.flow/checks/default.yaml` 中的校验命令。
- Plan 6: `finish` 记录证据、更新 handoff、推进任务状态。
- Plan 7: `adopt` 接入已有项目。
- Plan 8: `switch` 切换 Harness / Loop / 新 flow strategy。
