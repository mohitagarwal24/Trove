import { z } from "zod";
import { categories } from "./catalogue";
export const purposeSchema = z.enum([
  "internal_business_analysis",
  "ai_inference",
  "academic_research",
]);
export const recordFilterSchema = z
  .object({
    field: z.string().min(1).max(50),
    operator: z.enum(["contains", "equals", "after", "before"]),
    value: z.string().min(1).max(200),
  })
  .refine((filter) => {
    if (!["after", "before"].includes(filter.operator)) return true;
    const date = new Date(filter.value);
    return (
      /^\d{4}-\d{2}-\d{2}$/.test(filter.value) &&
      !Number.isNaN(+date) &&
      date.toISOString().slice(0, 10) === filter.value
    );
  }, "Date filters must use a valid YYYY-MM-DD date.");
export const dataNeedSchema = z.object({
  category: z.enum(categories),
  fields: z.array(z.string().min(1).max(50)).min(1).max(30),
  quantity: z.number().int().min(1).max(100),
  maxAgeDays: z.number().int().min(1).max(3650),
  filters: z.array(recordFilterSchema).max(10).default([]),
});
export const discoverySchema = z.object({
  query: z.string().trim().max(300).default(""),
  needs: z
    .array(dataNeedSchema)
    .min(1)
    .max(3)
    .refine(
      (needs) => new Set(needs.map((n) => n.category)).size === needs.length,
      "Use one need per category; combine its fields and filters.",
    ),
  purpose: purposeSchema,
  budgetCents: z.number().int().min(50).max(100000),
});
export type DataNeed = z.infer<typeof dataNeedSchema>;
export type DiscoveryRequest = z.infer<typeof discoverySchema>;
export const taskRequirementsSchema = discoverySchema.pick({
  needs: true,
  purpose: true,
});
export type TaskRequirements = z.infer<typeof taskRequirementsSchema>;
