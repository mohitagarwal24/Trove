"use client";
import { Plus, X } from "lucide-react";
import { categories, sourceDefinitions } from "@/lib/catalogue";
import type { TaskRequirements, DataNeed } from "@/lib/research";
const label = (s: string) =>
  s.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
export function initialRequirements(): TaskRequirements {
  return {
    purpose: "ai_inference",
    needs: [
      {
        category: "Drug approvals",
        fields: ["brand_name", "approval_date", "source_url"],
        quantity: 10,
        maxAgeDays: 30,
        filters: [],
      },
    ],
  };
}
export function ResearchRequirements({
  value,
  onChange,
}: {
  value: TaskRequirements;
  onChange: (v: TaskRequirements) => void;
}) {
  const update = (index: number, patch: Partial<DataNeed>) =>
    onChange({
      ...value,
      needs: value.needs.map((n, i) => (i === index ? { ...n, ...patch } : n)),
    });
  return (
    <div className="research-requirements">
      <fieldset className="research-categories">
        <legend>Data to find</legend>
        {categories.map((category) => (
          <label key={category} className="choice-label">
            <input
              type="checkbox"
              checked={value.needs.some((n) => n.category === category)}
              onChange={(e) =>
                onChange({
                  ...value,
                  needs: e.target.checked
                    ? [
                        ...value.needs,
                        {
                          category,
                          fields: sourceDefinitions
                            .find((s) => s.category === category)!
                            .fields.slice(0, 3),
                          quantity: value.needs[0]?.quantity || 10,
                          maxAgeDays: value.needs[0]?.maxAgeDays || 30,
                          filters: [],
                        },
                      ]
                    : value.needs.filter((n) => n.category !== category),
                })
              }
            />
            {category}
          </label>
        ))}
      </fieldset>
      <div className="form-row research-quantities">
        <label>
          Records per category
          <input
            type="number"
            min={1}
            max={100}
            value={value.needs[0]?.quantity || ""}
            onChange={(e) =>
              onChange({
                ...value,
                needs: value.needs.map((n) => ({
                  ...n,
                  quantity: Number(e.target.value),
                })),
              })
            }
          />
        </label>
        <label>
          Snapshot age (days)
          <input
            type="number"
            min={1}
            max={3650}
            value={value.needs[0]?.maxAgeDays || ""}
            onChange={(e) =>
              onChange({
                ...value,
                needs: value.needs.map((n) => ({
                  ...n,
                  maxAgeDays: Number(e.target.value),
                })),
              })
            }
          />
        </label>
      </div>
      <label>
        Intended use
        <select
          value={value.purpose}
          onChange={(e) =>
            onChange({
              ...value,
              purpose: e.target.value as TaskRequirements["purpose"],
            })
          }
        >
          <option value="ai_inference">AI research</option>
          <option value="academic_research">Academic research</option>
          <option value="internal_business_analysis">Business analysis</option>
        </select>
      </label>
      {value.needs.map((need, index) => (
        <details className="requirement-scope" key={need.category}>
          <summary>
            {need.category}
            <span>
              {need.fields.length} fields
              {need.filters.length ? ` · ${need.filters.length} filters` : ""}
            </span>
          </summary>
          <fieldset className="requirement-fields">
            <legend>Required fields</legend>
            {sourceDefinitions
              .find((s) => s.category === need.category)!
              .fields.map((field) => (
                <label className="choice-label" key={field}>
                  <input
                    type="checkbox"
                    checked={need.fields.includes(field)}
                    onChange={(e) =>
                      update(index, {
                        fields: e.target.checked
                          ? [...need.fields, field]
                          : need.fields.filter((f) => f !== field),
                      })
                    }
                  />
                  {label(field)}
                </label>
              ))}
          </fieldset>
          {need.filters.map((filter, f) => (
            <div className="requirement-filter" key={f}>
              <label>
                Filter field {f + 1}
                <select
                  value={filter.field}
                  onChange={(e) =>
                    update(index, {
                      filters: need.filters.map((r, j) =>
                        j === f ? { ...r, field: e.target.value } : r,
                      ),
                    })
                  }
                >
                  {sourceDefinitions
                    .find((s) => s.category === need.category)!
                    .fields.map((field) => (
                      <option key={field} value={field}>
                        {label(field)}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Match {f + 1}
                <select
                  value={filter.operator}
                  onChange={(e) =>
                    update(index, {
                      filters: need.filters.map((r, j) =>
                        j === f
                          ? {
                              ...r,
                              operator: e.target.value as typeof r.operator,
                            }
                          : r,
                      ),
                    })
                  }
                >
                  <option value="contains">Contains</option>
                  <option value="equals">Equals</option>
                  <option value="after">After date</option>
                  <option value="before">Before date</option>
                </select>
              </label>
              <label>
                Value {f + 1}
                <input
                  type={
                    ["after", "before"].includes(filter.operator)
                      ? "date"
                      : "text"
                  }
                  maxLength={200}
                  value={filter.value}
                  onChange={(e) =>
                    update(index, {
                      filters: need.filters.map((r, j) =>
                        j === f ? { ...r, value: e.target.value } : r,
                      ),
                    })
                  }
                />
              </label>
              <button
                className="icon-button"
                aria-label={`Remove ${need.category} filter ${f + 1}`}
                onClick={() =>
                  update(index, {
                    filters: need.filters.filter((_, j) => j !== f),
                  })
                }
              >
                <X size={15} />
              </button>
            </div>
          ))}
          {need.filters.length < 10 && (
            <button
              className="text-link"
              onClick={() =>
                update(index, {
                  filters: [
                    ...need.filters,
                    {
                      field:
                        need.fields[0] ||
                        sourceDefinitions.find(
                          (s) => s.category === need.category,
                        )!.fields[0],
                      operator: "contains",
                      value: "",
                    },
                  ],
                })
              }
            >
              <Plus size={14} /> Add a filter
            </button>
          )}
        </details>
      ))}
    </div>
  );
}
