# Trove design system

Trove is a professional data marketplace and an agent purchasing workspace. The central UX is discovery → comparison → explicit exact-price approval → progress → data with a receipt. The new implementation brief supersedes the earlier shared-authorisation proposal.

## Visual direction

An understated research terminal with the craft of a contemporary financial product. Warm canvas (#f8f9f6), white panels, ink (#20352e), subdued grey-green text with contrast-adjusted foregrounds, subtle borders (#e2e7df), and forest teal (#1d6b54). Lime (#ddecab) is a restrained secondary accent. No gradients, fabricated partner logos, giant marketing imagery, or decorative charts. Headings use locally hosted Manrope; body uses Inter; identifiers use a monospace stack.

## Layout and hierarchy

A 232px quiet sidebar anchors workspace navigation. A 72px top bar carries breadcrumbs and environment status. Main content has a 1280px maximum width, generous 32–40px gutters, 8px spacing increments, 12–16px panel radii, 1px borders, and small restrained shadows. Headlines contrast confident size with tightly edited copy. Desktop uses a catalogue grid and an independent research task panel. At tablet widths the panel moves below content; mobile uses a collapsible navigation drawer and a single column.

## Screens

- Discover: category filters, real metadata search, selectable offerings, details with fixed public preview, comparison tray. Never expose staged or paid payloads in search.
- Workspace: editable task and limit, structured requirements, source decisions, quote lines, exact total, activity. Deterministic demo and live AI are distinct.
- Approval: immutable quote, requested fields, licences, source timestamps, included commission, expiry, PayPal action. Simulation is a separate labelled action, never the PayPal button.
- Purchases: separate payment, fulfilment and settlement states; details, data access expiry, receipts, retry/reconcile, cancellation and refund where eligible.
- Seller studio: authenticated seller-only versioned offer edits and actual payables. Synthetic fixtures/history stay labelled.
- Connect: create/revoke scoped tokens, copy configuration, seven documented tools, integration readiness.

## Interaction/accessibility

Every icon-only action has an accessible label. Forms use visible labels. Keyboard focus is explicit; dialogs trap focus and restore it. Status uses text as well as colour. Financial values are tabular and always USD. Loading, errors, empty search, expired quotes, unavailable integrations and uncertain payments have designed states. No invented trust scores or hidden reasoning. Use short source-selection explanations, not chain-of-thought. Reduced-motion preferences disable nonessential transitions.

## Integrity

Persistent sandbox banner. Each purchase carries its payment provider: PayPal Sandbox or Simulation. Synthetic seller badges are visible on offer details and receipts. Capability status distinguishes configured from tested. Earnings are not payouts. A void is not a refund. Prices are server-calculated integer minor units; the included illustrative commission is disclosed before approval.
