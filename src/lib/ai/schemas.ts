import { z } from "zod";

export const searchResultSchema = z.object({
  contacts: z.array(
    z.object({
      id: z.string(),
      full_name: z.string(),
      title: z.string().nullable(),
      email: z.string().nullable(),
      company_name: z.string().nullable(),
      score: z.number(),
      reason: z.string(),
      warm_intro_path: z.array(z.string()),
      recommended_action: z.string(),
    }),
  ),
  summary: z.string(),
  suggested_actions: z.array(z.string()),
});

export const outreachResultSchema = z.object({
  subject: z.string().optional(),
  body: z.string().min(1),
  cta: z.string().min(1),
});
