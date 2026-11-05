import {
  App,
  applyHostStyleVariables,
  applyDocumentTheme,
} from "@modelcontextprotocol/ext-apps";

const app = new App({ name: "Trove research", version: "1.0.0" }, {});
const root = document.getElementById("app")!;
type Data = Record<string, any>;
let current: Data = {},
  tool = "",
  pending = false;
const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value / 100,
  );
const label = (value: string) => value.replaceAll("_", " ");
function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string,
) {
  const result = document.createElement(tag);
  if (text !== undefined) result.textContent = text;
  if (className) result.className = className;
  return result;
}
function safeUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
function link(value: unknown, text: string) {
  const url = safeUrl(value);
  if (!url) return node("span", "Source link unavailable");
  const a = node("a", text);
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.onclick = (event) => {
    event.preventDefault();
    void app.openLink({ url }).catch(showError);
  };
  return a;
}
function button(text: string, action: () => Promise<void>, secondary = false) {
  const b = node("button", text, secondary ? "secondary" : "primary");
  b.type = "button";
  b.disabled = pending;
  b.onclick = () => {
    if (!pending) void action().catch(showError);
  };
  return b;
}
function showError(error: unknown) {
  pending = false;
  root.querySelectorAll("button").forEach((b) => {
    b.disabled = false;
  });
  root.querySelector("[role=alert]")?.remove();
  const p = node(
    "p",
    error instanceof Error
      ? error.message
      : "Trove could not complete that action. Try again.",
    "error",
  );
  p.role = "alert";
  root.append(p);
}
async function call(name: string, args: Data) {
  pending = true;
  root.querySelectorAll("button").forEach((b) => {
    b.disabled = true;
  });
  try {
    const result = await app.callServerTool({ name, arguments: args });
    if (result.isError)
      throw new Error(
        result.content
          .filter((item) => item.type === "text")
          .map((item) => item.text)
          .join(" ") ||
          "Reconnect Trove with the requested permission and try again.",
      );
    receive(result, name);
    if (app.getHostCapabilities()?.updateModelContext)
      await app
        .updateModelContext({
          structuredContent: { tool: name, result: current },
        })
        .catch(() => {});
  } finally {
    pending = false;
    root.querySelectorAll("button").forEach((b) => {
      b.disabled = false;
    });
  }
}
function table(rows: Data[], fields?: string[]) {
  const wrap = node("div", undefined, "table-wrap");
  wrap.tabIndex = 0;
  wrap.setAttribute(
    "aria-label",
    "Data records; scroll horizontally for more fields",
  );
  const t = node("table"),
    thead = node("thead"),
    header = node("tr");
  const columns = (
    fields || [...new Set(rows.flatMap((r) => Object.keys(r)))]
  ).slice(0, 20);
  for (const field of columns) {
    const th = node("th", label(field));
    th.scope = "col";
    header.append(th);
  }
  thead.append(header);
  t.append(thead);
  const body = node("tbody");
  for (const row of rows.slice(0, 100)) {
    const tr = node("tr");
    for (const field of columns) {
      const cell = node("td");
      const value = row[field];
      if (field === "source_url" && safeUrl(value))
        cell.append(link(value, "Source record ↗"));
      else
        cell.textContent =
          value == null
            ? "—"
            : typeof value === "object"
              ? JSON.stringify(value)
              : String(value);
      tr.append(cell);
    }
    body.append(tr);
  }
  t.append(body);
  wrap.append(t);
  return wrap;
}
function sample(source: Data) {
  const rows = Array.isArray(source.preview)
    ? source.preview
        .slice(0, 2)
        .filter(
          (row: unknown) =>
            row && typeof row === "object" && !Array.isArray(row),
        )
    : [];
  const details = node("details"),
    summary = node(
      "summary",
      rows.length ? "Preview sample" : "Sample unavailable",
    );
  details.append(summary);
  if (rows.length) {
    details.append(
      node(
        "p",
        "Fixed source sample. Delivery uses your requested scope.",
        "muted",
      ),
    );
    const records = node("div", undefined, "sample-records");
    const fields: string[] =
      source.displayFields || source.fields || Object.keys(rows[0]);
    const identity = ["recall_number", "application_number", "event_id"].find(
      (field) => fields.includes(field),
    );
    rows.forEach((row: Data, index: number) => {
      const record = node("article", undefined, "sample-record");
      record.append(
        node(
          "h3",
          identity
            ? String(row[identity] || `Sample ${index + 1}`)
            : `Sample ${index + 1}`,
        ),
      );
      const values = node("dl");
      for (const field of fields.filter((field) => field !== identity)) {
        const group = node("div"),
          key = node("dt", label(field)),
          value = node("dd");
        const text =
          row[field] == null
            ? "—"
            : typeof row[field] === "object"
              ? JSON.stringify(row[field])
              : String(row[field]);
        if (field === "source_url" && safeUrl(row[field]))
          value.append(link(row[field], "Source record ↗"));
        else if (text.length > 180) {
          const more = node("details");
          more.append(
            node("summary", `${text.slice(0, 140)}…`),
            node("p", text),
          );
          value.append(more);
        } else value.textContent = text;
        group.append(key, value);
        values.append(group);
      }
      record.append(values);
      records.append(record);
    });
    details.append(records);
  }
  if (!rows.length)
    details.append(
      node(
        "p",
        `Available fields: ${(source.fields || []).map(label).join(", ")}`,
        "muted",
      ),
    );
  if (source.sourceUrl)
    details.append(link(source.sourceUrl, "Source documentation ↗"));
  return details;
}
function sourceRow(source: Data, selected: boolean) {
  const section = node("section", undefined, "source"),
    heading = node("div", undefined, "row");
  heading.append(
    node("h2", source.title || "Data source"),
    node(
      "strong",
      source.acquisition === "owned"
        ? "Owned · $0"
        : money(source.priceCents || 0),
    ),
  );
  section.append(heading);
  const date = source.freshnessAt
    ? new Date(source.freshnessAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "Unavailable";
  section.append(
    node(
      "p",
      `${source.category || "Source"} · Snapshot ${date}${selected ? " · Selected" : ""}`,
      "muted",
    ),
  );
  if (source.reason) section.append(node("p", source.reason, "muted"));
  if (source.missingFields?.length)
    section.append(
      node(
        "p",
        `Missing: ${source.missingFields.map(label).join(", ")}`,
        "error",
      ),
    );
  const preview = sample(source);
  preview.open = selected;
  section.append(preview);
  return section;
}
function heading(title: string, subtitle?: string) {
  root.append(node("h1", title));
  if (subtitle) root.append(node("p", subtitle, "muted"));
}
function renderDiscovery(data: Data) {
  heading(
    data.gaps?.length ? "Refine your data request" : "Your sources, in view",
    "Review the samples and scope before deciding.",
  );
  const chosen = new Set(data.selectedOfferIds || []);
  const sources: Data[] = data.candidates || data.offers || [];
  const primary = chosen.size
    ? sources.filter((source) => chosen.has(source.offerVersionId))
    : sources.slice(0, 3);
  for (const source of primary)
    root.append(
      sourceRow(
        {
          ...source,
          displayFields:
            data.request?.needs?.find(
              (need: Data) => need.category === source.category,
            )?.fields || source.fields,
        },
        chosen.has(source.offerVersionId),
      ),
    );
  const other = sources.filter((source) => !primary.includes(source));
  if (other.length) {
    const alternatives = node("details");
    alternatives.append(node("summary", `Other sources (${other.length})`));
    for (const source of other.slice(0, 12))
      alternatives.append(sourceRow(source, false));
    root.append(alternatives);
  }
  if (!sources.length)
    root.append(
      node(
        "p",
        "No matching sources. Try a different data category or research scope.",
        "muted",
      ),
    );
  for (const gap of data.gaps || [])
    root.append(node("p", gap.message, "error"));
  if (!data.gaps?.length && data.selectedOfferIds?.length) {
    const footer = node("div", undefined, "actions");
    footer.append(node("strong", `Total ${money(data.totalCents || 0)} USD`));
    if (data.nextAction === "get_result") {
      for (const source of data.reusableSources || [])
        footer.append(
          button("Use owned data", () =>
            call("get_result", { purchaseId: source.purchaseId }),
          ),
        );
    } else
      footer.append(
        button("Review exact quote", () =>
          call("create_quote", {
            offerIds: data.selectedOfferIds,
            taskId: data.task.id,
          }),
        ),
      );
    root.append(footer);
  }
}
function checkoutNote() {
  return node(
    "p",
    "PayPal approval opens on Trove. Checkout inside this chat is not enabled.",
    "muted",
  );
}
function renderQuote(data: Data) {
  heading("Review your purchase", "No charge has occurred.");
  for (const line of data.lines || []) {
    root.append(
      sourceRow(
        {
          ...line.offer,
          displayFields: line.fields,
          title: line.snapshot.title,
          priceCents: line.priceCents,
          freshnessAt: line.snapshot.freshnessAt,
        },
        true,
      ),
    );
    root.append(
      node(
        "p",
        `${line.quantity} records · ${line.fields.map(label).join(", ")}`,
        "muted",
      ),
    );
  }
  for (const reused of data.reusedSources || [])
    root.append(node("p", `${reused.title} · Already owned · $0`, "muted"));
  const details = node("details"),
    summary = node("summary", "Licence and price details");
  details.append(summary);
  details.append(
    node(
      "p",
      `Purpose: ${label(data.purpose)}. Included Trove fee: ${money(data.commissionCents)}. Quote expires ${new Date(data.expiresAt).toLocaleString()}.`,
    ),
  );
  for (const line of data.lines || [])
    details.append(node("p", line.snapshot.license));
  root.append(details);
  const footer = node("div", undefined, "actions");
  footer.append(node("strong", `Total ${money(data.totalCents)} USD`));
  if (data.totalCents > 0) {
    const expired = +new Date(data.expiresAt) <= Date.now();
    if (expired)
      root.append(
        node(
          "p",
          "This quote has expired. Ask Trove for a new quote.",
          "error",
        ),
      );
    else
      footer.append(
        button("Prepare PayPal checkout", () =>
          call("create_purchase", {
            quoteId: data.id,
            idempotencyKey: `chat:${data.id}`,
          }),
        ),
      );
    root.append(checkoutNote());
  } else
    for (const reused of data.reusedSources || [])
      footer.append(
        button("Use owned data", () =>
          call("get_result", { purchaseId: reused.purchaseId }),
        ),
      );
  root.append(footer);
}
function supportForm(purchaseId: string, replying = false) {
  const form = node("form"),
    legend = node(
      "h2",
      replying ? "Add information" : "Report a purchase issue",
    );
  form.append(legend);
  form.append(
    node(
      "p",
      "A reviewer checks the agreed scope and delivery evidence. Sending an issue does not trigger a refund.",
      "muted",
    ),
  );
  const categoryLabel = node("label", "What went wrong?"),
    category = node("select");
  for (const [value, title] of Object.entries({
    missing_data: "Missing records or fields",
    wrong_scope: "Wrong data scope",
    damaged_data: "Unusable data",
    duplicate_charge: "Charged twice",
    licence_issue: "Source or licence issue",
    other: "Another issue",
  })) {
    const option = node("option", title);
    option.value = value;
    category.append(option);
  }
  categoryLabel.append(category);
  if (!replying) form.append(categoryLabel);
  const textLabel = node(
      "label",
      replying ? "Additional information" : "Details",
    ),
    text = node("textarea");
  text.required = true;
  text.minLength = replying ? 10 : 20;
  text.maxLength = 3000;
  text.rows = 3;
  text.placeholder = "What did you expect, and what did you receive?";
  textLabel.append(text);
  form.append(textLabel);
  const evidenceLabel = node("label", "Evidence link (optional)"),
    evidence = node("input");
  evidence.type = "url";
  evidence.maxLength = 1000;
  evidence.placeholder = "https://…";
  evidenceLabel.append(evidence);
  form.append(evidenceLabel);
  const submit = node("button", "Send for review", "primary");
  submit.type = "submit";
  form.append(submit);
  form.onsubmit = (event) => {
    event.preventDefault();
    if (pending) return;
    void call(replying ? "reply_to_dispute" : "open_dispute", {
      purchaseId,
      ...(replying
        ? { message: text.value }
        : { category: category.value, description: text.value }),
      evidenceUrls: evidence.value.trim() ? [evidence.value.trim()] : [],
    }).catch(showError);
  };
  return form;
}
function renderCase(data: Data) {
  heading("Purchase issue");
  const dispute = data.dispute;
  if (!dispute) {
    root.append(node("p", "No issue has been opened for this purchase."));
    root.append(supportForm(data.purchaseId));
    return;
  }
  const states: Record<string, string> = {
    open: "Under review",
    needs_information: "More information needed",
    approved: "Refund approved",
    rejected: "Review completed",
    resolved_refund: "Refund completed",
  };
  root.append(node("p", states[dispute.state] || dispute.state));
  for (const message of dispute.messages || []) {
    const item = node("section", undefined, "message");
    item.append(
      node("strong", message.kind === "buyer" ? "You" : "Trove review"),
      node("p", message.body),
    );
    for (const url of message.evidenceUrls || [])
      item.append(link(url, "Evidence link ↗"));
    root.append(item);
  }
  if (["open", "needs_information", "rejected"].includes(dispute.state)) {
    const details = node("details");
    details.append(
      node("summary", "Add information"),
      supportForm(data.purchaseId, true),
    );
    root.append(details);
  }
}
function renderPurchase(data: Data) {
  heading(
    data.paymentState === "captured" ? "Your data is ready" : "Purchase status",
  );
  root.append(
    node(
      "p",
      `Payment: ${label(data.paymentState)} · Data: ${label(data.fulfilmentState)}`,
    ),
  );
  if (data.approvalUrl && data.paymentState === "created") {
    root.append(
      checkoutNote(),
      link(data.approvalUrl, "Approve with PayPal on Trove ↗"),
    );
  }
  const footer = node("div", undefined, "actions");
  if (data.paymentState === "captured") {
    footer.append(
      button("View purchased data", () =>
        call("get_result", { purchaseId: data.id }),
      ),
    );
    footer.append(
      button(
        "Report a problem",
        () => call("get_dispute", { purchaseId: data.id }),
        true,
      ),
    );
  } else
    footer.append(
      button(
        "Refresh status",
        () => call("get_purchase", { purchaseId: data.id }),
        true,
      ),
    );
  root.append(footer);
  if (data.error) root.append(node("p", data.error, "error"));
}
function renderResult(data: Data) {
  heading("Purchased data", "Retrieved from your workspace. No new charge.");
  for (const source of data.sources || []) {
    root.append(node("h2", source.title || "Data source"));
    if (Array.isArray(source.rows)) root.append(table(source.rows));
    if (source.sourceUrl)
      root.append(link(source.sourceUrl, "Source documentation ↗"));
  }
}
function render() {
  root.replaceChildren();
  if (
    tool.includes("dispute") ||
    ("dispute" in current && !current.paymentState && !current.purchase)
  )
    renderCase(current);
  else if (tool === "get_receipt") {
    heading("Purchase receipt");
    const document = current.document || {};
    if (typeof document.totalCents === "number")
      root.append(node("p", `Total paid ${money(document.totalCents)} USD`));
    root.append(
      node(
        "p",
        `Payment ${label(current.paymentState || "captured")}. Your agent can read the receipt and source attribution in this chat.`,
      ),
    );
  } else if (tool === "get_result" || Array.isArray(current.sources))
    renderResult(current);
  else if (current.purchase)
    renderPurchase({ ...current.purchase, approvalUrl: current.approvalUrl });
  else if (current.paymentState) renderPurchase(current);
  else if (current.lines && typeof current.totalCents === "number")
    renderQuote(current);
  else if (current.candidates || current.offers) renderDiscovery(current);
  else if (current.title && current.preview) {
    heading("Source preview");
    root.append(sourceRow(current, false));
  } else heading("Trove", "Ask your agent to find data for your research.");
}
function receive(result: Data, requestedTool?: string) {
  if (result.isError) {
    showError(
      new Error(
        (result.content || [])
          .filter((item: Data) => item.type === "text")
          .map((item: Data) => item.text)
          .join(" "),
      ),
    );
    return;
  }
  let data = result.structuredContent;
  if (!data) {
    try {
      data = JSON.parse(
        result.content?.find((item: Data) => item.type === "text")?.text ||
          "{}",
      );
    } catch {
      data = {};
    }
  }
  current = data && typeof data === "object" ? data : {};
  tool = requestedTool || result._meta?.troveTool || tool;
  render();
}
function theme(context: NonNullable<ReturnType<typeof app.getHostContext>>) {
  if (context.theme) applyDocumentTheme(context.theme);
  if (context.styles?.variables)
    applyHostStyleVariables(context.styles.variables);
  const inset = context.safeAreaInsets;
  if (inset)
    for (const side of ["top", "right", "bottom", "left"] as const)
      document.documentElement.style.setProperty(
        `--safe-${side}`,
        `${Math.max(0, inset[side] || 0)}px`,
      );
}
app.ontoolresult = receive;
app.onhostcontextchanged = theme;
app.ontoolcancelled = () =>
  showError(
    new Error("Action cancelled. Ask your agent to check the latest status."),
  );
void app
  .connect()
  .then(() => {
    const context = app.getHostContext();
    if (context) theme(context);
  })
  .catch(() => {
    root.replaceChildren(
      node("h1", "Trove"),
      node(
        "p",
        "Open this view through the connected Trove app to see source samples and your purchases.",
      ),
    );
  });
