# Trove

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Researchers and developers discover and compare scoped data offers, then approve an exact-price purchase. Sellers manage offer versions and review earnings. External agents use scoped, revocable access through Trove-account OAuth; manual tokens remain an advanced option.

## Product Purpose

Make research data discoverable, purchasable with explicit human approval, and traceable to source-linked receipts, so a user's agent can work from better context. Trove's broader direction spans medical, legal, and financial research. The currently available catalogue is medical/regulatory intelligence, with real public FDA records prepared as paid products; legal and financial research are explicitly future domains.

## Operating Context

The public `/` route introduces Trove through Data Convergence, a native-scroll story with an immediate sign-in action and a skip route. `/sign-in` provides Google authentication when configured, email sign-in/registration, and ownership verification through the existing shared authentication flow. Safe internal return paths continue the requested action; the default signed-in destination is `/dashboard`. The dashboard is authenticated on the server and shows actual recent tasks, available purchased data, payment attention, and agent connection state. Recent research resumes the owner's task through `/workspace?task=<id>`. `/discover` remains the public catalogue inside the working application shell.

Discover → compare, choose explicit requirements, or describe an optional AI research brief → immutable quote → human approval → delivery checks → payment capture → purchased results and receipt. Explicit-requirements discovery works without Gemini or prefunding; spending caps are limits rather than stored balances. Agents connect through the MCP URL and Trove-account consent, with client-specific setup for ChatGPT, Claude, Codex, and Claude Code. Connected apps expose actual scopes and revocation; consent identifies the account, client-provided app name, callback host, and the separate payment-approval boundary. Existing workspace, purchase, seller, connection, and account flows remain available. Payment, delivery, and settlement have independent states. AI and payments use real integrations; Sandbox is explicitly identified as the payment environment. The public story illustrates the path from sources to context and never stands in for a completed research task or transaction. Reduced motion and graphics failure preserve every chapter in ordinary document flow.

## Capabilities and Constraints

Preserve the implemented workflows, prices, permissions, source provenance and upstream rights. Supply/provider assumptions are disclosed in the hackathon pitch. Keep hosting and integrations within free options. Never fabricate providers, verification, payments, or AI calls. Existing Next.js application and Render deployment are the implementation targets. Architecture and routine implementation decisions are delegated by the user.

## Brand Commitments

The name is Trove. The user requests a professional, distinctive identity replacing the generic green theme, usable at normal browser zoom. The sidebar's “Your agent. Better informed.” content must remain reachable on shorter laptop screens.

## Evidence on Hand

Six offers backed by real regulatory records, three illustrative supplier identities disclosed in docs/PITCH.md, private account/provider flows, local fonts and project documentation. No customer testimonials or real data-provider relationships are established.

## Product Principles

- The user approves each exact purchase.
- Source scope and licence precede payment.
- Genuine model and payment responses govern status; missing configuration fails closed.
- Source reuse rights and original attribution survive preparation and sale.
- Layout and interaction serve a working research tool.
