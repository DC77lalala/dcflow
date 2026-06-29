import { main } from './cli.js';

// 可执行入口只负责启动 CLI，并把未捕获错误转成终端可读输出。
// 业务命令注册放在 `cli.ts`，避免测试导入入口文件时直接执行命令。
main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
