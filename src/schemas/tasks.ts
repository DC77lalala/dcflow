import { z } from 'zod';

// 任务状态必须收敛在这四种，避免 AI 随手写出 done/completed 等不可识别状态。
export const taskStatusSchema = z.enum(['not_started', 'active', 'blocked', 'passing']);

export const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: taskStatusSchema,
  priority: z.number().int().nonnegative(),
  verification: z.array(z.string().min(1)),
  evidence: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

// `.flow/state/tasks.yaml` 的顶层结构。
export const tasksFileSchema = z.object({
  tasks: z.array(taskSchema),
});

export type FlowTask = z.infer<typeof taskSchema>;
export type TasksFile = z.infer<typeof tasksFileSchema>;
