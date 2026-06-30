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

## 2026-06-30 - Plan 4 Agreed Scope

Scope:

- Implement `start` as a read-only command that generates the current AI work packet.
- Use the active task selected by `task active`.
- Include enough `.flow` context for Claude, Codex, Cursor, or another AI coding tool to continue the task without rereading the whole project.

Command design:

- `dcflow start` reads `.flow/config.yaml`, `.flow/state/tasks.yaml`, `.flow/checks/default.yaml`, and `.flow/state/handoff.md`.
- It requires exactly one active task.
- It prints a Markdown-style work packet to stdout.
- It does not modify `.flow` state.

Out of scope for Plan 4:

- Running checks.
- Updating task status.
- Writing work packets to disk.
- Detecting changed files.
- Tool-specific prompt formats.

Next:

- Implement Plan 4 with TDD and update this log again when completed.

## 2026-06-30 - Plan 4 Completed

Scope:

- Implement `start` as a read-only command that generates a Markdown-style AI work packet.
- Read active task, project config, checks, handoff, and validation status from `.flow`.
- Keep the command focused on context injection; no task state is modified.

Status:

- Completed.

Files created:

- `src/commands/start.ts`
- `tests/unit/start.test.ts`

Files modified:

- `src/cli.ts`
- `README.md`
- `docs/execution-log.md`

Implementation notes:

- `getStartWorkPacket` reads `.flow/config.yaml`, `.flow/state/tasks.yaml`, `.flow/checks/default.yaml`, and `.flow/state/handoff.md`.
- `startCommand` renders a Markdown-style packet with project, flow, validation state, active task, flow rules, checks, and handoff.
- `start` requires an active task and fails with `No active task found. Run \`dcflow task active <task-id>\` first.` when none exists.
- The command is intentionally read-only; `check` and `finish` will handle execution and state transitions in later plans.

TDD evidence:

- First Plan 4 test run failed because `src/commands/start.ts` did not exist yet.
- After implementation, `tests/unit/start.test.ts` passed alongside the existing command and schema tests.

Verification:

- `pnpm.cmd test`: passed, 9 test files, 35 tests.
- `pnpm.cmd build`: passed, generated `dist/index.js`, `dist/index.js.map`, and `dist/index.d.ts`.
- Manual CLI validation in `D:\code\dc_code\dcflow-demo-plan4`: `init`, `task add`, `task active`, and `start` all passed.
- `start` output included project name, flow name, `Validation: ok`, active task details, flow rules, configured checks, and handoff content.
- A regression test was added for the initial handoff template so new projects no longer include obsolete Plan 3 instructions or the unsupported `--active` option.

Next:

- Continue with Plan 5: implement `check`.

## 2026-06-30 - Plan 5 Agreed Scope

Scope:

- Implement `check` to execute configured local verification commands.
- Read checks from `.flow/checks/default.yaml`.
- Print one result per check and a summary.
- Treat required check failures as command failures.

Command design:

- `dcflow check` runs checks sequentially.
- Each check uses its configured `command`, `cwd`, and `required` flag.
- Required failures make the command fail.
- Optional failures are reported but do not make the command fail.

Out of scope for Plan 5:

- Parallel check execution.
- Persisting check evidence into task state.
- Updating task status.
- Shell-specific interactive commands.
- Check retries or timeouts.

Next:

- Implement Plan 5 with TDD and update this log again when completed.

## 2026-06-30 - Plan 5 Completed

Scope:

- Implement `check` to execute `.flow/checks/default.yaml`.
- Run checks sequentially and report one result per check.
- Fail the command when any required check fails.
- Report optional failures without failing the overall run.

Status:

- Completed.

Files created:

- `src/commands/check.ts`
- `tests/unit/check.test.ts`

Files modified:

- `src/cli.ts`
- `README.md`
- `docs/execution-log.md`

Implementation notes:

- `runChecks` reads `.flow/checks/default.yaml`, executes each command with `execaCommand`, and returns structured results for later `finish` evidence reuse.
- `checkCommand` renders readable CLI output, including command, cwd, required flag, exit code, stdout, stderr, and summary.
- Required failures set `process.exitCode = 1` in the CLI.
- Optional failures appear in the summary but do not fail the overall command.
- Commands currently run with `shell: true` for practical Windows/PowerShell compatibility.

TDD evidence:

- First Plan 5 test run failed because `src/commands/check.ts` did not exist yet.
- Tests cover required pass, required failure, optional failure, and readable output summary.

Verification:

- `pnpm.cmd test`: passed, 10 test files, 39 tests.
- `pnpm.cmd build`: passed, generated `dist/index.js`, `dist/index.js.map`, and `dist/index.d.ts`.
- Manual success path in `D:\code\dc_code\dcflow-demo-plan4`: `check` ran the default `node --version` check and printed `Summary: 1 passed, 0 failed`.
- Manual required failure path in `D:\code\dc_code\dcflow-demo-plan5-fail`: `check` ran `node -e "process.exit(3)"`, printed `Required checks failed.`, and exited with code 1.

Next:

- Continue with Plan 6: implement `finish`.

## 2026-06-30 - Plan 6 Agreed Scope

Scope:

- Implement `finish` as the session close command.
- Require an active task before running checks or changing state.
- Run the configured checks from `.flow/checks/default.yaml`.
- Record check evidence into the active task.
- Update `.flow/state/handoff.md` with the latest finish summary.
- Move the active task to `passing` when required checks pass.
- Move the active task to `blocked` when any required check fails.

Command design:

- `dcflow finish` reuses the Plan 5 `runChecks` implementation.
- Required check failures make the command fail with exit code 1.
- Optional check failures are recorded as evidence but do not block the task from becoming `passing`.
- The command writes both success and failure evidence so the next AI session can recover the exact state.

Out of scope for Plan 6:

- Interactive notes.
- Appending a full historical handoff log.
- Git diff capture.
- Auto-committing changes.
- Flow-specific finish strategies for Harness vs Loop.

## 2026-06-30 - Plan 6 Completed

Scope:

- Implement `finish` to run checks, persist evidence, update handoff, and advance task status.
- Preserve a readable CLI summary for both passing and blocked results.

Status:

- Completed.

Files created:

- `src/commands/finish.ts`
- `tests/unit/finish.test.ts`

Files modified:

- `src/core/taskStore.ts`
- `src/cli.ts`
- `README.md`
- `docs/execution-log.md`

Implementation notes:

- `runFinish` reads the active task, project config, and check results, then writes the finish state.
- `finishActiveTask` centralizes task state mutation in `taskStore` so command code does not hand-roll YAML updates.
- Passing required checks move the active task to `passing`.
- Failed required checks move the active task to `blocked` and set the CLI exit code to 1.
- Evidence entries include timestamp, PASS/FAIL, check name, required flag, and exit code.
- `.flow/state/handoff.md` is refreshed with the latest task, result, check summary, and next step.

TDD evidence:

- First Plan 6 test run failed because `src/commands/finish.ts` did not exist yet.
- Tests cover passing finish, blocked finish, readable output, and the no-active-task guard.

Verification:

- `pnpm.cmd test`: passed, 11 test files, 43 tests.
- `pnpm.cmd build`: passed, generated `dist/index.js`, `dist/index.js.map`, and `dist/index.d.ts`.
- Manual CLI validation in `D:\code\dc_code\dcflow-demo-plan6`: `init`, `task add`, `task active`, and `finish` all passed.
- Manual `finish` output showed `Result: passing` and `Checks: 1 passed, 0 failed`.
- Manual state validation confirmed the task moved to `passing`, evidence was written to `.flow/state/tasks.yaml`, and the latest summary was written to `.flow/state/handoff.md`.

Next:

- Continue with Plan 7: implement `adopt`.

## 2026-06-30 - Plan 7 Agreed Scope

Scope:

- Implement `adopt` for existing projects.
- Create missing `.flow` files without overwriting existing project files.
- Detect project type using the existing project detector.
- Preserve existing AI entry files such as `AGENTS.md`, `CLAUDE.md`, and `.cursorrules`.
- Generate `.flow/adoption-report.md` with detected signals, existing AI files, generated checks, and next steps.
- Infer default checks from common project signals:
  - Node/Vue projects: `npm run test` and/or `npm run build` when scripts exist.
  - Maven projects: `mvn test`.
  - Unknown projects: `node --version` placeholder.

Command design:

- `dcflow adopt` runs in the current project directory.
- `dcflow adopt --project-name <name>` can override the detected project name.
- Existing files are reported as skipped instead of overwritten.
- The command is intentionally non-destructive so it can be tried on old projects safely.

Out of scope for Plan 7:

- Moving or rewriting existing AI rule files.
- Deep framework-specific check inference.
- Interactive migration prompts.
- Applying changes to `package.json`.
- Real adoption against `D:\code\shanyu-bg`; that should happen after the command behavior is stable.

## 2026-06-30 - Plan 7 Completed

Scope:

- Implement `adopt` as a safe existing-project onboarding command.
- Generate `.flow` state, checks, handoff, and an adoption report.
- Preserve existing AI entry files by skipping them.

Status:

- Completed.

Files created:

- `src/commands/adopt.ts`
- `tests/unit/adopt.test.ts`

Files modified:

- `src/cli.ts`
- `README.md`
- `docs/execution-log.md`

Implementation notes:

- `adoptProject` writes only missing files and records existing files in `skipped`.
- Existing `AGENTS.md`, `CLAUDE.md`, and `.cursorrules` are detected and reported.
- Node/Vue checks are inferred from `package.json` scripts.
- Maven checks use `mvn test`.
- `.flow/adoption-report.md` records detected project type, signals, existing AI files, generated checks, and next steps.
- `package.json` parsing strips a UTF-8 BOM so files written by PowerShell are handled correctly.

TDD evidence:

- First Plan 7 test run failed because `src/commands/adopt.ts` did not exist yet.
- Tests cover safe adoption with existing AI files, Maven check inference, repeated adoption skipping, and readable CLI output.
- A manual CLI run exposed UTF-8 BOM handling in `package.json`; regression tests were added before fixing it.

Verification:

- `pnpm.cmd test`: passed, 12 test files, 49 tests.
- `pnpm.cmd build`: passed, generated `dist/index.js`, `dist/index.js.map`, and `dist/index.d.ts`.
- Manual CLI validation in `D:\code\dc_code\dcflow-demo-plan7-bom`: `adopt` preserved an existing `AGENTS.md`, detected a Node project from `package.json`, inferred `npm run test` and `npm run build`, created `.flow/adoption-report.md`, and created `CLAUDE.md`.

Next:

- Continue with Plan 8: implement `switch`.

## 2026-06-30 - Plan 8 Agreed Scope

Scope:

- Implement `switch` to update the current flow strategy in `.flow/config.yaml`.
- Support the built-in strategies already defined by schema: `harness` and `loop`.
- Reject missing or unsupported strategies before writing config.
- Preserve existing project and adapter config when switching.
- Keep this plan focused on configuration switching only.

Command design:

- `dcflow switch loop` changes `flow.current` from `harness` to `loop`.
- `dcflow switch harness` changes it back to `harness`.
- Re-switching to the current strategy reports unchanged.
- Unknown strategies fail with a readable error.

Out of scope for Plan 8:

- Strategy-specific `start` work packet content.
- Strategy plugins.
- Per-strategy check templates.
- Migration of tasks between strategy state machines.

## 2026-06-30 - Plan 8 Completed

Scope:

- Implement `switch` as a validated `.flow/config.yaml` update command.
- Wire the command into the CLI.
- Add tests for switching, unchanged switching, missing strategy, unsupported strategy, and readable output.

Status:

- Completed.

Files created:

- `src/commands/switch.ts`
- `tests/unit/switch.test.ts`

Files modified:

- `src/cli.ts`
- `README.md`
- `docs/execution-log.md`

Implementation notes:

- `switchFlow` reads `.flow/config.yaml`, validates the requested strategy with `flowNameSchema`, and writes the updated config.
- Project name and adapter configuration are preserved.
- Missing strategy fails with `Flow strategy is required. Supported strategies: harness, loop.`
- Unsupported strategy fails with `Unsupported flow strategy: <name>. Supported strategies: harness, loop.`
- Re-switching to the same strategy reports `Flow unchanged`.

TDD evidence:

- First Plan 8 test run failed because `src/commands/switch.ts` did not exist yet.
- Tests cover successful switch, unchanged switch, unsupported strategy, missing strategy, and formatted CLI output.

Verification:

- `pnpm.cmd test`: passed, 13 test files, 55 tests.
- `pnpm.cmd build`: passed, generated `dist/index.js`, `dist/index.js.map`, and `dist/index.d.ts`.
- Manual CLI validation in `D:\code\dc_code\dcflow-demo-plan8`: `init`, `status`, `switch loop`, and `status` all passed.
- Manual state validation confirmed `.flow/config.yaml` changed from `flow.current: harness` to `flow.current: loop` while preserving project name and adapters.

Next:

- Continue with Plan 9: add strategy-specific behavior to `start`.
