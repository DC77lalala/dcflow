# dcflow

dcflow 是一个面向 AI 辅助开发的 Flow Runtime CLI。它把项目中的 AI 开发流程沉淀到 `.flow` 目录、`AGENTS.md` / `CLAUDE.md` 和一组 CLI 命令里，让 Codex、Claude、Cursor 等 agent 在不同会话之间能接上上下文。

它适合解决这些问题：

- 新会话不知道上一次做到哪一步。
- 任务状态只存在聊天记录里，换 agent 后容易丢。
- AI 没有统一工作规则，容易顺手重构、跳过验证或误判完成。
- 老项目已有 `AGENTS.md`，但新模板更新后不知道怎么安全合并。
- 想先把 Harness 这类 AI 开发流程统一成项目内可维护规则。
- 团队每个成员有独立的Harness 不方便维护。

## 快速开始

你可以用两种方式使用 dcflow。

### 方式一：拉源码本地运行

适合想参与开发、调试源码或验证最新代码的人。

```powershell
git clone https://github.com/DC77lalala/dcflow.git
cd dcflow
pnpm install
pnpm build
```

构建后，用 Node 直接运行本地入口：

```powershell
node D:\code\dc_code\dcflow\dist\index.js <command>
```

例如：

```powershell
node D:\code\dc_code\dcflow\dist\index.js init --yes --project-name my-flow-test
```

### 方式二：通过 npm 安装

```powershell
npm install -g dcflow
```

安装后可以直接使用：

```powershell
dcflow <command>
```

例如：

```powershell
dcflow init --yes --project-name my-flow-test
```

也可以不全局安装，直接用：

```powershell
npx dcflow init --yes --project-name my-flow-test
```

## 常用命令

下面示例默认使用 npm 安装后的 `dcflow` 命令。如果你是源码本地运行，把 `dcflow` 换成：

```powershell
node D:\code\dc_code\dcflow\dist\index.js
```

### 新项目初始化

进入目标项目目录：

```powershell
cd D:\code\dc_code\my-flow-test
dcflow init --yes --project-name my-flow-test
```

默认生成中文模板。需要英文模板时：

```powershell
dcflow init --yes --project-name my-flow-test --language en-US
```

### 老项目接入

已有业务项目推荐使用 `adopt`：

```powershell
cd D:\code\dc_code\personal-blog
dcflow adopt --project-name personal-blog
```

`adopt` 会尽量只创建缺失文件，不覆盖已有 `AGENTS.md`、`CLAUDE.md` 或 `.flow` 状态文件。

### 让 agent 接管

初始化或接入完成后，在 Codex / Claude 中这样说：

```text
请先阅读 AGENTS.md，并按 dcflow 规则接管本项目。

当前目标：梳理项目结构，不修改代码。

要求：
1. 如果 .flow/state/tasks.yaml 里还没有任务，请创建一个 active 任务。
2. 更新 .flow/work-packet.md，记录当前目标、范围、计划和验证方式。
3. 更新 .flow/state/handoff.md，记录本轮进展、风险和下一步。
4. 不要修改业务代码。
```

## 结果展示

执行 `init` 或 `adopt` 后，项目中会出现类似结构：

```text
.
├─ AGENTS.md
├─ CLAUDE.md
└─ .flow/
   ├─ config.yaml
   ├─ work-packet.md
   ├─ adoption-report.md
   ├─ checks/
   │  └─ default.yaml
   ├─ conflicts/
   │  └─ 20260703-102030-AGENTS.dcflow-template.md
   ├─ docs/
   │  └─ README.md
   ├─ attachments/
   │  └─ README.md
   └─ state/
      ├─ tasks.yaml
      └─ handoff.md
```

核心文件用途：

- `AGENTS.md` / `CLAUDE.md`: agent 入口规则，约定会话开始、工作规则和会话结束动作。
- `.flow/work-packet.md`: 当前任务工作包，由程序员和 agent 持续维护。
- `.flow/state/tasks.yaml`: 任务池和状态，包含 `not_started`、`active`、`blocked`、`passing`。
- `.flow/state/handoff.md`: 每轮会话结束后的交接记录。
- `.flow/checks/default.yaml`: `check` / `finish` 使用的本地验证命令。
- `.flow/conflicts/`: 当已有 AI 入口文档不能安全覆盖时，保存当前模板副本，方便手动合并。

### 冲突副本示例

如果项目里已经有 `AGENTS.md`，dcflow 不会覆盖它，而是输出：

```text
Skipped: AGENTS.md
Conflict: AGENTS.md -> template copy .flow/conflicts/20260703-102030-AGENTS.dcflow-template.md
```

你可以打开原文件和模板副本，手动合并需要的规则：

```powershell
notepad .\AGENTS.md
notepad .\.flow\conflicts\20260703-102030-AGENTS.dcflow-template.md
```

### 查看状态

```powershell
dcflow status
```

示例输出：

```text
Project: my-flow-test
Flow: harness
Tasks: 1
Active task: task-20260703-101500 梳理项目结构
Validation: ok
```

### 手动创建任务

你可以让 agent 自己维护 `tasks.yaml`，也可以用 CLI 手动登记任务：

```powershell
dcflow task add "实现登录接口"
dcflow task list
dcflow task active task-20260703-101500
```

同一时间只允许一个任务处于 `active` 状态。

### 生成工作包

```powershell
dcflow start
```

`start` 是只读命令，会基于当前任务、当前 flow strategy、handoff 和检查配置生成一份 AI 工作包。

### 运行验证

```powershell
dcflow check
```

`check` 会执行 `.flow/checks/default.yaml` 中配置的命令。`required: true` 的检查失败时，命令整体失败。

### 收尾任务

```powershell
dcflow finish
```

`finish` 会运行检查、写入验证证据、更新 `tasks.yaml` 和 `handoff.md`。所有 required 检查通过时，active 任务会变成 `passing`；失败时会变成 `blocked`。

### 切换 Flow

```powershell
dcflow switch harness
dcflow switch loop
```

当前主线模板是 `harness`。`loop` 目前只是一个内置实验性 flow strategy：它会影响 `start` 输出里的 `Flow Rules` 文案，但还不是完整的 Loop Engineering 执行引擎。

当前可切换值：

- `harness`
- `loop`，实验性

切换后再次运行 `start`，工作包里的 `Flow Rules` 会变化。

## 生成的 Work Rules

dcflow 生成的 `AGENTS.md` / `CLAUDE.md` 会约束 agent：

- 一次只允许一个任务处于 `active` 状态。
- 不因为代码已经写了就把任务标记为完成。
- 不为通过结果而弱化验证规则。
- 优先依赖仓库持久化文件，不依赖聊天记录作为事实来源。
- 除非当前任务明确要求，否则不顺手重构其他模块。
- 工作区已有未说明改动时，先判断是否冲突；冲突时暂停并记录。
- 修改代码时，在关键类、方法、复杂逻辑和 SQL 上补充简洁中文注释。
- 不自行提交代码，除非用户明确要求。
- 如果本轮先写方案或文档，写完后等待用户确认，再开始写代码。

## 开发

```powershell
cd D:\code\dc_code\dcflow
pnpm install
pnpm test
pnpm build
```

项目要求：

- Node.js >= 18
- pnpm 11.x

常用开发命令：

```powershell
pnpm test
pnpm build
node dist\index.js --help
```
