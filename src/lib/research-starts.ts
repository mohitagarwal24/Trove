import type { TaskRequirements } from "./research";

export const researchStarts = [
  {
    id: "drug-approvals",
    title: "Drug approvals",
    description: "Products, sponsors and approval dates",
    category: "Drug approvals",
    fields: ["brand_name", "sponsor_name", "approval_date", "source_url"],
  },
  {
    id: "drug-recalls",
    title: "Drug recalls",
    description: "Recall reasons, severity and status",
    category: "Drug recalls",
    fields: [
      "product_description",
      "reason_for_recall",
      "classification",
      "status",
      "source_url",
    ],
  },
  {
    id: "device-recalls",
    title: "Device recalls",
    description: "Devices, manufacturers and recall reasons",
    category: "Device recalls",
    fields: [
      "product_description",
      "firm_name",
      "reason_for_recall",
      "source_url",
    ],
  },
] as const;

export function requirementsForStart(
  id: string | null,
): TaskRequirements | null {
  const start = researchStarts.find((item) => item.id === id);
  return start
    ? {
        purpose: "ai_inference",
        needs: [
          {
            category: start.category,
            fields: [...start.fields],
            quantity: 10,
            maxAgeDays: 30,
            filters: [],
          },
        ],
      }
    : null;
}
