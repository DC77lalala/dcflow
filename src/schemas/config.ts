import { z } from 'zod';

// dcflow 第一版只内置这几个 flow。后续插件化时可以放宽为字符串。
export const flowNameSchema = z.enum(['harness', 'loop']);

// AI 工具入口类型。这里先限制已知工具，避免配置拼写错误后静默失效。
export const adapterNameSchema = z.enum(['claude', 'codex', 'cursor', 'kiro']);

// `.flow/config.yaml` 的结构定义。
// Zod 会同时提供运行时校验和 TypeScript 类型推导。
export const configSchema = z.object({
  project: z.object({
    name: z.string().min(1),
  }),
  flow: z.object({
    current: flowNameSchema,
  }),
  adapters: z.object({
    enabled: z.array(adapterNameSchema).default([]),
  }),
});

export type FlowConfig = z.infer<typeof configSchema>;
