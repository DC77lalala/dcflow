# dcflow Execution Log

This file records implementation progress so another agent can resume without relying on chat history.

## 2026-06-29 - Plan 0 Completed

Scope:

- Create the TypeScript CLI project skeleton.
- Add placeholder commands for `init`, `adopt`, `task`, `status`, `start`, `check`, `finish`, and `switch`.
- Add basic tests for version and help output.
- Verify `pnpm test`, `pnpm build`, and `node dist/index.js --help`.

Status:

- Completed.

Files created:

- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `tsconfig.json`
- `tsup.config.ts`
- `vitest.config.ts`
- `src/index.ts`
- `src/cli.ts`
- `tests/unit/cli.test.ts`
- `README.md`
- `docs/execution-log.md`

Implementation notes:

- `src/cli.ts` contains reusable, side-effect-free CLI helpers.
- `src/index.ts` is the executable entry and only calls `main()`.
- The build shebang is injected by `tsup.config.ts`; `src/index.ts` intentionally has no source shebang to avoid duplicate `#!` in `dist/index.js`.
- `pnpm-workspace.yaml` explicitly allows `esbuild` build scripts because tsup depends on esbuild.
- `packageManager` is pinned to `pnpm@11.9.0` for repeatable setup on a new machine.

Verification:

- `pnpm.cmd test`: passed, 1 test file, 4 tests.
- `pnpm.cmd build`: passed, generated `dist/index.js`, `dist/index.js.map`, and `dist/index.d.ts`.
- `node dist\index.js --help`: passed, help includes `init`, `adopt`, `task`, `status`, `start`, `check`, `finish`, and `switch`.
- `node dist\index.js --version`: passed, prints `0.1.0`.
- `node dist\index.js init`: passed, prints Plan 2 placeholder message.

Next:

- Continue with Plan 1: define `.flow` state model and schema validation.

## 2026-06-29 - Plan 1 Completed

Scope:

- Define schemas for `.flow/config.yaml`, `.flow/state/tasks.yaml`, and `.flow/checks/default.yaml`.
- Implement `validateFlowFiles(root)` as the shared validation entry point.
- Add fixtures for valid state, multiple active tasks, missing required fields, and malformed YAML.
- Preserve TDD evidence by first running tests with the missing validator and confirming the expected failure.

Status:

- Completed.

Files created:

- `src/schemas/config.ts`
- `src/schemas/tasks.ts`
- `src/schemas/checks.ts`
- `src/core/schemaValidator.ts`
- `tests/unit/schemaValidator.test.ts`
- `tests/fixtures/valid-flow/.flow/config.yaml`
- `tests/fixtures/valid-flow/.flow/state/tasks.yaml`
- `tests/fixtures/valid-flow/.flow/checks/default.yaml`
- `tests/fixtures/invalid-multiple-active/.flow/config.yaml`
- `tests/fixtures/invalid-multiple-active/.flow/state/tasks.yaml`
- `tests/fixtures/invalid-multiple-active/.flow/checks/default.yaml`
- `tests/fixtures/invalid-missing-field/.flow/config.yaml`
- `tests/fixtures/invalid-missing-field/.flow/state/tasks.yaml`
- `tests/fixtures/invalid-missing-field/.flow/checks/default.yaml`
- `tests/fixtures/invalid-yaml/.flow/config.yaml`
- `tests/fixtures/invalid-yaml/.flow/state/tasks.yaml`
- `tests/fixtures/invalid-yaml/.flow/checks/default.yaml`

Implementation notes:

- `configSchema` currently allows `harness` and `loop` flow names.
- Adapter names are restricted to `claude`, `codex`, `cursor`, and `kiro`.
- Task statuses are restricted to `not_started`, `active`, `blocked`, and `passing`.
- `validateFlowFiles(root)` reads and validates all required `.flow` files, then applies the cross-file rule that only one task may be `active`.
- Validation errors are intentionally formatted with readable file labels, such as `tasks.yaml: tasks.0.title is required`.
- TypeScript files include Chinese comments around the key schema and validation decisions.

TDD evidence:

- First Plan 1 test run failed because `src/core/schemaValidator.js` did not exist, proving the new tests were active before implementation.

Verification:

- `pnpm.cmd test`: passed, 2 test files, 8 tests.
- `pnpm.cmd build`: passed, generated `dist/index.js`, `dist/index.js.map`, and `dist/index.d.ts`.

Next:

- Continue with Plan 2: implement `flow init` for new project initialization.

## 2026-06-29 - Plan 2 Completed

Scope:

- Implement `dcflow init` / `flow init` for new project initialization.
- Detect basic project type and project name from the target directory.
- Generate the first `.flow` structure and AI entry files.
- Keep the generated `.flow` files compatible with the Plan 1 schema validator.

Status:

- Completed.

Files created:

- `src/core/projectDetector.ts`
- `src/core/templateRenderer.ts`
- `src/commands/init.ts`
- `tests/unit/projectDetector.test.ts`
- `tests/unit/templateRenderer.test.ts`
- `tests/unit/init.test.ts`

Files modified:

- `src/cli.ts`
- `docs/execution-log.md`

Implementation notes:

- `initProject({ yes: true })` is the first supported initialization path; fully interactive prompts are intentionally deferred.
- `init` creates `.flow/config.yaml`, `.flow/state/tasks.yaml`, `.flow/state/handoff.md`, `.flow/checks/default.yaml`, `AGENTS.md`, and `CLAUDE.md`.
- Generated config defaults to the `harness` flow and enables `claude` plus `codex` adapters.
- Existing generated files are protected by default; users must pass `--force` to overwrite them.
- Project detection currently recognizes generic Node projects, Vue/Vite projects, and Maven Java projects, then falls back to `custom`.
- TypeScript source files include Chinese comments around key functions and state/file decisions for easier reading.

TDD evidence:

- First Plan 2 test run failed because the new init, project detection, and template rendering modules did not exist yet.
- CLI option tests failed before the `init` command was wired to the real implementation, then passed after the command registration was updated.

Verification:

- `pnpm.cmd test`: passed, 5 test files, 19 tests.
- `pnpm.cmd build`: passed, generated `dist/index.js`, `dist/index.js.map`, and `dist/index.d.ts`.
- `node dist\index.js init --help`: passed, help includes `--yes`, `--force`, and `--project-name`.
- Manual init in `D:\code\dc_code\dcflow-demo-plan2-final`: passed, generated `.flow/config.yaml`, `.flow/state/tasks.yaml`, `.flow/state/handoff.md`, `.flow/checks/default.yaml`, `AGENTS.md`, and `CLAUDE.md`.
- Programmatic schema validation for the generated demo project returned `{"ok":true,"errors":[]}`.

Next:

- Continue with Plan 3: task management commands such as `task add`, `task list`, and `status`.

## 2026-06-29 - Plan 3 Agreed Scope

Scope:

- Implement the first task management loop with `task add`, `task list`, and `status`.
- Keep the command behavior intentionally small so later `start`, `check`, and `finish` commands have a stable task state to consume.

Command design:

- `dcflow task add <title>` appends a new task to `.flow/state/tasks.yaml`.
- New tasks start with `status: not_started`, `priority: 0`, `verification: []`, and `evidence: []`.
- `dcflow task list` prints all known tasks, or `No tasks found.` when the list is empty.
- `dcflow status` prints the project name, active flow, task count, active task if present, and schema validation result.

Out of scope for Plan 3:

- Changing active tasks.
- Marking tasks blocked or passing.
- Interactive task selection.
- Running project verification commands.
- Generating AI work packets.

Next:

- Implement Plan 3 with TDD and update this log again when the plan is completed.

## 2026-06-29 - Plan 3 Completed

Scope:

- Implement `task add`, `task list`, and `status`.
- Store new tasks in `.flow/state/tasks.yaml`.
- Keep generated task state compatible with the Plan 1 schema validator.
- Update README usage examples to reflect the current Plan 3 capability.

Status:

- Completed.

Files created:

- `src/core/taskStore.ts`
- `src/commands/task.ts`
- `src/commands/status.ts`
- `tests/unit/taskStore.test.ts`
- `tests/unit/taskCommands.test.ts`
- `tests/unit/status.test.ts`

Files modified:

- `src/cli.ts`
- `README.md`
- `docs/execution-log.md`

Implementation notes:

- `taskStore` centralizes reading and writing `.flow/state/tasks.yaml`.
- `task add <title>` trims the title, rejects blank titles, and appends a task with `status: not_started`, `priority: 0`, `verification: []`, and `evidence: []`.
- Task ids use local time in the format `task-YYYYMMDD-HHMMSS`; same-second collisions receive a `-2`, `-3`, etc. suffix.
- `task list` prints `No tasks found.` for an empty list, otherwise prints one line per task.
- `status` reads `.flow/config.yaml`, `.flow/state/tasks.yaml`, and the shared validator, then prints project name, flow name, task count, active task, and validation result.
- PowerShell may display Chinese YAML content as mojibake depending on console encoding; Node UTF-8 reads confirmed the file content itself is correct.

TDD evidence:

- First Plan 3 test run failed because `src/core/taskStore.ts`, `src/commands/task.ts`, and `src/commands/status.ts` did not exist yet.
- After manual CLI validation revealed UTC-based ids, tests were changed to expect local-time ids and failed against the old implementation before the timestamp formatter was fixed.

Verification:

- `pnpm.cmd test`: passed, 8 test files, 27 tests.
- `pnpm.cmd build`: passed, generated `dist/index.js`, `dist/index.js.map`, and `dist/index.d.ts`.
- Manual init in `D:\code\dc_code\dcflow-demo-plan3-final`: passed.
- `node D:\code\dc_code\dcflow\dist\index.js task add "实现登录接口"`: passed, added a `not_started` task.
- `node D:\code\dc_code\dcflow\dist\index.js task list`: passed, listed the created task.
- `node D:\code\dc_code\dcflow\dist\index.js status`: passed, printed project summary and `Validation: ok`.
- Node UTF-8 read of generated `tasks.yaml`: passed, confirmed Chinese task title was stored correctly.

Next:

- Continue with Plan 4: generate the current AI work packet with `start`.

## 2026-06-29 - Plan 3.5 Agreed Scope

Scope:

- Add a minimal task activation command before implementing `start`.
- Keep the command focused on selecting the current task only.

Command design:

- `dcflow task active <task-id>` marks the matching task as `active`.
- Any previously active task is downgraded to `not_started`.
- Unknown task ids fail with a readable error and do not change `tasks.yaml`.
- `status` should then show the active task.

Out of scope for Plan 3.5:

- Marking tasks as passing.
- Blocking tasks.
- Finishing tasks.
- Interactive task selection.
- Generating AI work packets.

Next:

- Implement Plan 3.5 with TDD and update this log again when completed.

## 2026-06-29 - Plan 3.5 Completed

Scope:

- Implement `task active <task-id>` before Plan 4.
- Ensure `status` displays the selected active task.
- Keep task state valid under the existing schema rule that only one task can be active.

Status:

- Completed.

Files modified:

- `src/core/taskStore.ts`
- `src/commands/task.ts`
- `src/cli.ts`
- `tests/unit/taskStore.test.ts`
- `tests/unit/taskCommands.test.ts`
- `tests/unit/status.test.ts`
- `README.md`
- `docs/execution-log.md`

Implementation notes:

- `activateFlowTask` first verifies that the target task id exists, then rewrites task statuses.
- The selected task becomes `active`.
- Any previously active task is downgraded to `not_started`.
- Unknown task ids throw `Task not found: <task-id>` and do not change task state.
- `task active` is exposed as a CLI subcommand and prints `active <task-id>: <title>`.

TDD evidence:

- First Plan 3.5 test run failed because `activateFlowTask` and `activateTaskCommand` did not exist yet.
- After implementation, the new activation tests passed alongside the existing task and status tests.

Verification:

- `pnpm.cmd test`: passed, 8 test files, 31 tests.
- `pnpm.cmd build`: passed, generated `dist/index.js`, `dist/index.js.map`, and `dist/index.d.ts`.
- Manual success path in `D:\code\dc_code\my-flow-test`: `task active task-20260629-170050` printed `active task-20260629-170050: 实现登录接口`.
- Manual error path in `D:\code\dc_code\my-flow-test`: `task active missing-task` failed with `Task not found: missing-task`.
- `status` after activation printed `Active task: task-20260629-170050 实现登录接口` and `Validation: ok`.
- UTF-8 read of `.flow/state/tasks.yaml` confirmed the task was persisted with `status: active`.

Next:

- Continue with Plan 4: implement `start` to generate the current AI work packet from the active task.
