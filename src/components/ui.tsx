"use client";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  ArrowUpRight,
  Database,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import type { ReactNode } from "react";
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand ${small ? "brand-small" : ""}`}>
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M16 2 29 9.5 16 17 3 9.5 16 2Z" fill="currentColor" />
        <path
          d="m3 15 13 7.5L29 15v7.5L16 30 3 22.5V15Z"
          fill="currentColor"
          opacity=".7"
        />
      </svg>
      <span>
        trove<span className="brand-period">.</span>
      </span>
    </span>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber" | "blue" | "red";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Status({ value }: { value: string }) {
  const good = [
    "captured",
    "available",
    "validated",
    "paid",
    "completed",
  ].includes(value);
  const bad = ["failed", "returned", "recovery_required"].includes(value);
  return (
    <Badge
      tone={
        good
          ? "green"
          : bad
            ? "red"
            : [
                  "awaiting_approval",
                  "pending",
                  "owed",
                  "authorized",
                  "capture_pending",
                  "refund_pending",
                  "reconciliation_required",
                ].includes(value)
              ? "amber"
              : "neutral"
      }
    >
      <span className="status-dot" />
      {value.replaceAll("_", " ")}
    </Badge>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className={`dialog ${wide ? "dialog-wide" : ""}`}>
          <div className="dialog-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>
                {description || "Review the details below."}
              </Dialog.Description>
            </div>
            <Dialog.Close className="icon-button" aria-label="Close dialog">
              <X size={19} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Database size={25} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Loading({
  label = "Loading your workspace…",
}: {
  label?: string;
}) {
  return (
    <div className="loading-state">
      <Loader2 size={22} className="spin" />
      <span>{label}</span>
    </div>
  );
}
export function Notice({
  children,
  kind = "info",
}: {
  children: ReactNode;
  kind?: "info" | "error" | "success";
}) {
  return (
    <div
      className={`notice notice-${kind}`}
      role={kind === "error" ? "alert" : "status"}
    >
      {kind === "success" ? <Check size={17} /> : <AlertCircle size={17} />}
      <div>{children}</div>
    </div>
  );
}
export function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-link">
      {children}
      <ArrowUpRight size={14} />
    </a>
  );
}
export function DataTable({ rows }: { rows: Record<string, unknown>[] }) {
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  if (!rows.length) return <p className="muted">No rows to display.</p>;
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {keys.map((k) => (
              <th key={k}>{k.replaceAll("_", " ")}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {keys.map((k) => (
                <td key={k}>
                  {typeof row[k] === "object"
                    ? JSON.stringify(row[k])
                    : String(row[k] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export const shortId = (id: string) => id.slice(-8).toUpperCase();
export function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
