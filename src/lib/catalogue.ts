export const categories = [
  "Drug approvals",
  "Drug recalls",
  "Device recalls",
] as const;
export const providerDefinitions = [
  {
    id: "northstar-regulatory",
    name: "Northstar Regulatory",
    initials: "N",
    color: "mint",
    description: "Drug approval and product intelligence.",
    connectorId: "drug-approvals",
  },
  {
    id: "atlas-safety",
    name: "Atlas Safety",
    initials: "A",
    color: "blue",
    description: "Structured drug recall intelligence.",
    connectorId: "drug-recalls",
  },
  {
    id: "meridian-devices",
    name: "Meridian Devices",
    initials: "M",
    color: "sand",
    description: "Medical device recall intelligence.",
    connectorId: "device-recalls",
  },
] as const;
export const sourceDefinitions = [
  {
    key: "drug-approvals",
    sellerId: "northstar-regulatory",
    category: "Drug approvals",
    endpoint:
      "https://api.fda.gov/drug/drugsfda.json?limit=100&sort=submissions.submission_status_date:desc",
    documentation: "https://open.fda.gov/apis/drug/drugsfda/",
    fields: [
      "application_number",
      "sponsor_name",
      "brand_name",
      "active_ingredients",
      "dosage_form",
      "route",
      "marketing_status",
      "approval_date",
      "source_url",
    ],
    offers: [
      {
        key: "drug-approvals-full",
        title: "Drug approval dossiers",
        description:
          "Application, sponsor, active ingredients and approval dates, normalized into one research-ready batch.",
        priceCents: 320,
        fields: [] as string[],
        limit: 50,
      },
      {
        key: "drug-approvals-index",
        title: "Drug approval index",
        description:
          "A compact index of approved products, sponsors and original approval dates.",
        priceCents: 140,
        fields: [
          "application_number",
          "sponsor_name",
          "brand_name",
          "approval_date",
          "source_url",
        ],
        limit: 25,
      },
    ],
  },
  {
    key: "drug-recalls",
    sellerId: "atlas-safety",
    category: "Drug recalls",
    endpoint:
      "https://api.fda.gov/drug/enforcement.json?limit=100&sort=report_date:desc",
    documentation: "https://open.fda.gov/apis/drug/enforcement/",
    fields: [
      "recall_number",
      "product_description",
      "recalling_firm",
      "classification",
      "status",
      "reason_for_recall",
      "recall_initiation_date",
      "report_date",
      "distribution_pattern",
      "source_url",
    ],
    offers: [
      {
        key: "drug-recalls-full",
        title: "Drug recall intelligence",
        description:
          "Recall reasons, severity, status and distribution for drug safety and supply-chain research.",
        priceCents: 280,
        fields: [] as string[],
        limit: 50,
      },
      {
        key: "drug-recalls-index",
        title: "Drug recall watchlist",
        description:
          "Recall identifiers, firms, classifications and report dates for a quick risk screen.",
        priceCents: 120,
        fields: [
          "recall_number",
          "product_description",
          "recalling_firm",
          "classification",
          "report_date",
          "source_url",
        ],
        limit: 25,
      },
    ],
  },
  {
    key: "device-recalls",
    sellerId: "meridian-devices",
    category: "Device recalls",
    endpoint:
      "https://api.fda.gov/device/recall.json?limit=100&sort=event_date_initiated:desc",
    documentation: "https://open.fda.gov/apis/device/recall/",
    fields: [
      "event_id",
      "product_description",
      "firm_name",
      "product_code",
      "reason_for_recall",
      "root_cause",
      "event_date_initiated",
      "action",
      "source_url",
    ],
    offers: [
      {
        key: "device-recalls-full",
        title: "Medical device recall dossiers",
        description:
          "Recall events with product codes, root causes and manufacturer actions for device-market research.",
        priceCents: 260,
        fields: [] as string[],
        limit: 50,
      },
      {
        key: "device-recalls-index",
        title: "Device recall index",
        description:
          "A compact product and manufacturer index linked to individual recall events.",
        priceCents: 110,
        fields: [
          "event_id",
          "product_description",
          "firm_name",
          "product_code",
          "event_date_initiated",
          "source_url",
        ],
        limit: 25,
      },
    ],
  },
] as const;
export type DataRow = Record<string, string | number>;
export const sourceLicenseUrl = "https://open.fda.gov/license/";
export const sourceAttribution =
  "Data provided by the U.S. Food and Drug Administration (openFDA).";
export const dataLicense =
  "Underlying openFDA data: CC0, subject to source exceptions and third-party rights. Price covers preparation and delivery; it does not restrict rights in the public-domain source. Research use; not clinical advice.";
