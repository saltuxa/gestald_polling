import { z } from "zod";

export const createPollSchema = z.object({
  question: z.string().trim().min(1).max(140),
  options: z
    .array(z.string().trim().min(1).max(80))
    .min(2)
    .max(6)
    .refine((options) => new Set(options.map((option) => option.toLowerCase())).size === options.length, {
      message: "Options must be unique"
    }),
  privacyMode: z.enum(["anonymous_choice", "public_choice"]).default("anonymous_choice")
});

export const castVoteSchema = z.object({
  optionId: z.string().min(1),
  displayName: z.string().trim().min(1).max(50)
});
