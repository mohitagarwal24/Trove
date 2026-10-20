export type Category = "Drug approvals" | "Drug recalls" | "Device recalls";
export type Offer = {
  id: string;
  offerId: string;
  version: number;
  sellerId: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  priceCents: number;
  recordLimit: number;
  fields: string[];
  prohibited: string[];
  purposes: string[];
  license: string;
  coverage: string;
  freshnessAt: string;
  schema: unknown;
  preview: unknown;
  available: boolean;
  accessClass: string;
  sourceUrl: string | null;
  sourceLicenseUrl: string | null;
  sourceAttribution: string | null;
  retrievedAt: string | null;
  seller: {
    id: string;
    name: string;
    initials: string;
    color: string;
    description: string;
  };
};
export type DataFilter = {
  category: string;
  field: string;
  operator: "contains" | "equals" | "after" | "before";
  value: string;
};
export type Requirements = {
  needs?: import("./research").DataNeed[];
  filters?: DataFilter[];
  categories: string[];
  fields: string[];
  purpose: string;
  maxAgeDays: number;
  quantity: number;
};
export type Decision = {
  offerId: string;
  title: string;
  selected: boolean;
  reason: string;
};
export type Task = {
  id: string;
  prompt: string;
  budgetCents: number;
  spentCents: number;
  reservedCents: number;
  requirements: Requirements;
  decisions: Decision[];
  planner: string;
  createdAt: string;
};
export type QuoteLineView = {
  id: string;
  sellerId: string;
  fields: string[];
  quantity: number;
  priceCents: number;
  sellerCents: number;
  snapshot: {
    title: string;
    sellerName: string;
    version: number;
    license: string;
    freshnessAt: string;
    coverage: string;
    filters?: DataFilter[];
    accessHours?: number;
  };
  offer: Offer;
};
export type ReusedSource = {
  purchaseId: string;
  offerVersionId: string;
  title: string;
  fields: string[];
  quantity: number;
};
export type QuoteView = {
  reusedSources: ReusedSource[];
  id: string;
  taskId: string | null;
  totalCents: number;
  commissionCents: number;
  currency: string;
  purpose: string;
  planHash: string;
  expiresAt: string;
  createdAt: string;
  lines: QuoteLineView[];
};
export type PurchaseView = {
  id: string;
  quoteId: string;
  taskId: string | null;
  mode: string;
  paymentState: string;
  fulfilmentState: string;
  settlementState: string;
  paypalOrderId: string | null;
  approvedAt: string | null;
  authorizationId: string | null;
  captureId: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  quote: QuoteView;
  entitlement: { expiresAt: string; revokedAt: string | null } | null;
  executions: {
    id: string;
    state: string;
    resultHash: string | null;
    checks: { name: string; passed: boolean }[];
  }[];
  payables: {
    id: string;
    sellerId: string;
    state: string;
    amountCents: number;
    error: string | null;
  }[];
  receipt: { id: string; document: unknown } | null;
};
export type UserView = {
  hasPassword: boolean;
  googleConnected: boolean;
  id: string;
  name: string;
  email: string;
  role: string;
  sellerId: string | null;
  workspaceId: string;
};
export type Capabilities = {
  googleAuth: boolean;
  paypal: boolean;
  paypalClientId: string | null;
  payouts: boolean;
  ai: boolean;
  paymentEnvironment: "sandbox" | "live";
};
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
