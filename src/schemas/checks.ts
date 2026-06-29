import { z } from 'zod';

export const checkSchema = z.object({
  name: z.string().min(1),
  command: z.string().min(1),
  cwd: z.string().min(1).default('.'),
  required: z.boolean().default(true),
});

// `.flow/checks/default.yaml` 的顶层结构。
export const checksFileSchema = z.object({
  checks: z.array(checkSchema),
});

export type FlowCheck = z.infer<typeof checkSchema>;
export type ChecksFile = z.infer<typeof checksFileSchema>;
