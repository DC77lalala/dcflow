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

## 2026-06-30 - Plan 9 Agreed Scope

Scope:

- Make `start` output different flow rules based on `.flow/config.yaml` `flow.current`.
- Keep `start` read-only.
- Preserve the existing work packet sections: project, flow, validation, active task, checks, and handoff.
- Add Harness-specific rules for Blueprint / Spec driven work.
- Add Loop-specific rules for Observe / Plan / Act / Verify / Reflect.

Command design:

- `dcflow start` in `harness` mode prints `## Flow Rules: Harness`.
- `dcflow start` in `loop` mode prints `## Flow Rules: Loop`.
- `dcflow switch loop` followed by `dcflow start` should produce Loop rules without changing the active task.

Out of scope for Plan 9:

- Strategy plugins.
- Strategy-specific state machines.
- Strategy-specific check generation.
- Changing task statuses during `start`.

## 2026-06-30 - Plan 9 Completed

Scope:

- Implement strategy-specific `start` work packet rules for Harness and Loop.
- Keep the rules centralized outside `start` so later strategies can be added without bloating the command.

Status:

- Completed.

Files created:

- `src/core/flowStrategies.ts`

Files modified:

- `src/commands/start.ts`
- `tests/unit/start.test.ts`
- `README.md`
- `docs/execution-log.md`

Implementation notes:

- `getFlowStrategyRules` maps `harness` and `loop` to their rule title and rule list.
- `startCommand` now renders `## Flow Rules: Harness` or `## Flow Rules: Loop` based on the current config.
- Harness rules emphasize Blueprint, Spec, task state, quality gate, and finish learning.
- Loop rules emphasize Observe, Plan, Act, Verify, and Reflect.
- `start` remains read-only.

TDD evidence:

- First Plan 9 test run failed because `start` still rendered the generic `## Flow Rules` section.
- Tests cover Harness rule output and Loop rule output after `switchFlow({ strategy: 'loop' })`.

Verification:

- `pnpm.cmd test`: passed, 13 test files, 58 tests.
- `pnpm.cmd build`: passed, generated `dist/index.js`, `dist/index.js.map`, and `dist/index.d.ts`.
- Manual CLI validation in `D:\code\dc_code\dcflow-demo-plan9-clean`: `start` in harness mode printed `## Flow Rules: Harness`, then `switch loop` followed by `start` printed `## Flow Rules: Loop`.
- Manual validation also confirmed the rendered handoff `Current flow:` line follows the current config after switching.

Next:

- Continue with real project validation against `D:\code\shanyu-bg`, or start Plan 10 for plugin-style strategy extension.

## 2026-07-02 - Plan 10 Agreed Scope

Scope:

- Centralize generated templates instead of keeping long template strings inside command files.
- Make Chinese the default template language for new dcflow projects.
- Support `zh-CN` and `en-US` for generated project files and `start` work packets.
- Store the selected language in `.flow/config.yaml` as `language`.
- Add `--language zh-CN|en-US` to `init` and `adopt`.
- Keep full interactive language selection out of this plan; CLI option plus default Chinese is the current minimum.

Command design:

- `dcflow init --yes --project-name <name>` creates Chinese templates by default.
- `dcflow init --yes --project-name <name> --language en-US` creates English templates.
- `dcflow adopt --language en-US` creates English adoption templates for old projects.
- `dcflow start` reads `.flow/config.yaml` and renders its work packet in the configured language.

Out of scope for Plan 10:

- Translating every CLI status/error message.
- Interactive prompts for language selection.
- External user-editable template packs.
- Plugin-style strategy loading.

## 2026-07-02 - Plan 10 Completed

Scope:

- Implement template centralization and language-aware generated content.
- Keep command behavior compatible with existing projects that do not yet have `language` in config.

Status:

- Completed.

Files created:

- `src/templates/types.ts`
- `src/templates/zh-CN.ts`
- `src/templates/en-US.ts`
- `src/templates/index.ts`

Files modified:

- `src/cli.ts`
- `src/commands/init.ts`
- `src/commands/adopt.ts`
- `src/commands/start.ts`
- `src/core/flowStrategies.ts`
- `src/schemas/config.ts`
- `tests/unit/init.test.ts`
- `tests/unit/adopt.test.ts`
- `tests/unit/start.test.ts`
- `README.md`
- `docs/execution-log.md`

Implementation notes:

- `src/templates` now owns generated handoff, AGENTS, adoption report, start labels, and Harness / Loop rules.
- `language` is validated in config and defaults to `zh-CN`, so older `.flow/config.yaml` files still parse.
- `initProject` and `adoptProject` accept `language`, resolve it through the shared template registry, and write it into `.flow/config.yaml`.
- `start` reads `config.language`, renders labels and rules from the selected template set, and remains read-only.
- `getFlowStrategyRules` now returns language-aware strategy rules while still supporting only `harness` and `loop`.

TDD evidence:

- Plan 10 tests were added before implementation for default Chinese `init`, English `init`, default Chinese `adopt`, English `adopt`, Chinese `start`, and English `start`.
- First Plan 10 test run failed because language support and `src/templates` did not exist yet.
- After implementation, the full unit test suite passed.

Verification:

- `pnpm.cmd test`: passed, 13 test files, 61 tests.
- `pnpm.cmd build`: passed.
- Manual CLI validation in `D:\code\dc_code\dcflow-demo-plan10-zh-final`: default `init` wrote `language: zh-CN`, generated Chinese AGENTS / handoff templates, and `start` printed Chinese work packet sections with Chinese Harness rules.
- Manual CLI validation in `D:\code\dc_code\dcflow-demo-plan10-en`: `init --language en-US` wrote `language: en-US`, generated English AGENTS / handoff templates, and `start` printed the English work packet with English Harness rules.

Next:

- Continue with Plan 11: use dcflow against dcflow itself for a realistic self-test, then decide whether the next milestone is interactive prompts, external template packs, or a minimum npm release.

## 2026-07-02 - Plan 11 Workspace Docs Scope

Scope:

- Add a generated `.flow/docs/` area for AI-produced project documents.
- Add a generated `.flow/attachments/` area for product manager inputs, prototypes, requirement documents, screenshots, and other reference material.
- Include README files in both directories so the directories are created and their purpose is explicit.
- Update generated `AGENTS.md` and `CLAUDE.md` templates so agents know where to find external requirement material and where to place generated requirement, analysis, and plan documents.
- Apply the same behavior to both `init` and `adopt`.
- Support both `zh-CN` and `en-US` templates.

Implementation notes:

- `src/templates` now includes `workspaceDocs.docsReadme` and `workspaceDocs.attachmentsReadme`.
- `initProject` writes `.flow/docs/README.md` and `.flow/attachments/README.md`.
- `adoptProject` writes the same files when they do not already exist.
- Chinese and English AGENTS / CLAUDE templates now include document location guidance.

TDD evidence:

- Added tests first for `init` and `adopt` requiring both new README files and path guidance in generated AI entry files.
- Initial test run failed because `.flow/docs/README.md`, `.flow/attachments/README.md`, and AGENTS/CLAUDE path guidance did not exist yet.
- After implementation, focused `init` and `adopt` tests passed.

Verification:

- `pnpm.cmd test`: passed, 13 test files, 63 tests.
- `pnpm.cmd build`: passed.
- Manual CLI validation in `D:\code\dc_code\dcflow-demo-docs-folders`: `init` created `.flow/docs/README.md`, `.flow/attachments/README.md`, and AGENTS/CLAUDE path guidance.
- Manual CLI validation in `D:\code\dc_code\dcflow-demo-docs-adopt`: `adopt` preserved an existing `AGENTS.md`, created `CLAUDE.md`, and created the new docs / attachments README files.

Next:

- Continue with self-use validation and decide whether interactive language selection or npm release should be next.

## 2026-07-02 - Plan 12 Work Packet Scope

Scope:

- Generate `.flow/work-packet.md` during `init` and `adopt`.
- Treat `.flow/work-packet.md` as a maintainable current-task context file, not as a cache of `flow start` output.
- Update generated `AGENTS.md` and `CLAUDE.md` so agents read `.flow/work-packet.md` at session start.
- Tell agents to update `.flow/work-packet.md` at session end when task progress, plan, scope, or verification approach changes.
- Keep `.flow/state/handoff.md` as the session handoff file for completed work, risks, and next step.
- Support both `zh-CN` and `en-US` templates.

Implementation notes:

- `LanguageTemplates` now includes a `workPacket` template.
- `initProject` writes `.flow/work-packet.md`.
- `adoptProject` writes `.flow/work-packet.md` when it does not already exist.
- Chinese and English AGENTS / CLAUDE templates now include session start and session end maintenance rules for work-packet, handoff, docs, and attachments.

TDD evidence:

- Added tests first requiring `.flow/work-packet.md` in both `init` and `adopt`.
- Added tests requiring AGENTS / CLAUDE to reference `.flow/work-packet.md` and its update rule.
- Initial focused test run failed because the work-packet file and AGENTS / CLAUDE guidance did not exist yet.
- After implementation, focused `init` and `adopt` tests passed.

Verification:

- `pnpm.cmd test`: passed, 13 test files, 63 tests.
- `pnpm.cmd build`: passed.
- Manual CLI validation in `D:\code\dc_code\dcflow-demo-work-packet`: `init` created `.flow/work-packet.md`, and AGENTS / CLAUDE instruct agents to read and update it.
- Manual CLI validation in `D:\code\dc_code\dcflow-demo-work-packet-adopt`: `adopt` created `.flow/work-packet.md`, preserved an existing `AGENTS.md`, and generated `CLAUDE.md` with work-packet maintenance guidance.

Next:

- Use a fresh real project to test a full agent-maintained login/register task loop.

## 2026-07-02 - Plan 12 Task State Maintenance Guidance

Scope:

- Align generated AGENTS / CLAUDE session-end rules with the task-state model used by `.flow/state/tasks.yaml`.
- Make agents maintain current task `status`, `verification`, `evidence`, and `notes` at the end of each session.
- Require verification evidence before marking a task as `passing`.
- Require unresolved blockers to stay visible through `blocked`, `notes`, or `evidence`.

Implementation notes:

- Chinese and English init templates now include `.flow/state/tasks.yaml` maintenance rules in Session End.
- Chinese and English adopt templates now include the same rules.
- README now documents the intended meaning of `verification`, `evidence`, and `notes`.

TDD evidence:

- Added failing tests first for Chinese and English `init` AGENTS / CLAUDE output.
- Added failing tests first for Chinese and English `adopt` AGENTS / CLAUDE output.
- Initial focused tests failed because generated guidance did not mention updating `.flow/state/tasks.yaml`.
- After template updates, focused `init` and `adopt` tests passed.

Verification:

- Focused `pnpm.cmd test tests/unit/init.test.ts`: passed.
- Focused `pnpm.cmd test tests/unit/adopt.test.ts`: passed.
- `pnpm.cmd test`: passed, 13 test files, 63 tests.
- `pnpm.cmd build`: passed.
- `git diff --check`: passed, with only Windows LF-to-CRLF warnings.
- Manual CLI validation in `D:\code\dc_code\dcflow-demo-tasks-guidance`: Chinese `init` generated AGENTS / CLAUDE with `.flow/state/tasks.yaml`, `evidence`, `passing`, and `blocked` guidance.
- Manual CLI validation in `D:\code\dc_code\dcflow-demo-tasks-guidance-en`: English `init --language en-US` generated the same task-state guidance.

## 2026-07-02 - Plan 12 Work Rules Expansion

Scope:

- Add a stronger `Work Rules` section to generated AGENTS / CLAUDE files.
- Preserve the shanyu-bg style rules while making them generic for dcflow projects.
- Cover single-active-task discipline, completion discipline, blocker bypass limits, verification integrity, persistent source of truth, narrow task scope, dirty workspace handling, Chinese comments, no self-commit, and user approval before coding after a written proposal.

Implementation notes:

- Chinese init and adopt templates now include `Work Rules`.
- English init and adopt templates now include equivalent `Work Rules`.
- README now documents the generated Work Rules so users know what agent behavior dcflow is trying to enforce.

TDD evidence:

- Added failing assertions first for Chinese init AGENTS / CLAUDE output.
- Added failing assertions first for English init AGENTS output.
- Added failing assertions first for Chinese adopt CLAUDE output and English adopt AGENTS output.
- Initial focused tests failed because generated templates did not contain `## Work Rules`.
- After template updates, focused `init` and `adopt` tests passed.

Verification:

- `pnpm.cmd test`: passed, 13 test files, 63 tests.
- `pnpm.cmd build`: passed.
- `git diff --check`: passed, with only Windows LF-to-CRLF warnings.
- Manual CLI validation in `D:\code\dc_code\dcflow-demo-work-rules`: Chinese `init` generated AGENTS / CLAUDE with Work Rules.
- Manual CLI validation in `D:\code\dc_code\dcflow-demo-work-rules-en`: English `init --language en-US` generated AGENTS / CLAUDE with equivalent Work Rules.

## 2026-07-03 - Adopt Conflict Template Copies

Scope:

- Improve `adopt` for existing projects when generated AI entry templates conflict with existing `AGENTS.md` or `CLAUDE.md`.
- Keep original files unchanged.
- Generate timestamped template copies under `.flow/conflicts/`.
- Print conflict paths in CLI output and record them in `.flow/adoption-report.md`.
- Keep state files such as `.flow/state/tasks.yaml` and `.flow/state/handoff.md` as skip-only files.

Implementation notes:

- `AdoptResult` now includes `conflicts`.
- Existing `AGENTS.md` / `CLAUDE.md` create template copies named like `.flow/conflicts/20260703-102030-AGENTS.dcflow-template.md`.
- Adoption report templates now include a conflict template copy section in both Chinese and English.
- README documents conflict copy behavior and manual merge expectations.

TDD evidence:

- Added a failing test for existing `AGENTS.md` with user-owned `Work Rules`.
- Added a failing summary-output assertion for `Conflict: <file> -> template copy <path>`.
- Initial focused `adopt` test failed because `conflicts` and conflict output did not exist.
- After implementation, focused `adopt` tests passed.

Verification:

- `pnpm.cmd test`: passed, 13 test files, 64 tests.
- `pnpm.cmd build`: passed.
- `git diff --check`: passed, with only Windows LF-to-CRLF warnings.
- Manual CLI validation in `D:\code\dc_code\dcflow-demo-adopt-conflict`: existing `AGENTS.md` stayed unchanged, `.flow/conflicts/20260703-022110-AGENTS.dcflow-template.md` was created, and `.flow/adoption-report.md` recorded the conflict copy path.

## 2026-07-03 - Plan 13 Safe Init Conflicts

Scope:

- Make `init` safe when a project already has `AGENTS.md` or `CLAUDE.md`.
- Avoid overwriting user-owned AI entry files.
- Generate timestamped template copies under `.flow/conflicts/` for AI entry conflicts.
- Pre-scan target files before writing so `.flow` state conflicts do not leave a half-initialized project.

Implementation notes:

- Added `src/core/conflictTemplates.ts` for shared conflict timestamp and path helpers.
- `initProject` now returns `conflicts` like `adoptProject`.
- Existing `AGENTS.md` / `CLAUDE.md` are skipped and receive a template copy.
- Existing non-AI target files, including `.flow/state/tasks.yaml`, stop `init` before any new files are written.
- CLI init output now prints skipped files and conflict template copy paths.

TDD evidence:

- Added failing tests first for existing `AGENTS.md` during init.
- Added failing tests first for existing `.flow/state/tasks.yaml` to verify no partial initialization occurs.
- Initial focused `init` tests failed because `init` still threw on `AGENTS.md` and the state conflict setup exposed the old behavior.
- After implementation, focused `init` and `adopt` tests passed.

Verification:

- `pnpm.cmd test`: passed, 13 test files, 65 tests.
- `pnpm.cmd build`: passed.
- `git diff --check`: passed, with only Windows LF-to-CRLF warnings.
- Manual CLI validation in `D:\code\dc_code\dcflow-demo-init-conflict`: existing `AGENTS.md` stayed unchanged, `.flow/conflicts/20260703-035945-AGENTS.dcflow-template.md` was created, and `init` completed.
- Manual CLI validation in `D:\code\dc_code\dcflow-demo-init-state-conflict`: existing `.flow/state/tasks.yaml` made `init` exit with code 1, and no `.flow/config.yaml` or `.flow/conflicts` directory was created.
