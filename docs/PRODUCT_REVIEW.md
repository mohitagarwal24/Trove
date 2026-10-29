# Product review and startup polish

Reviewed 29 October 2026. This is a refinement of Trove’s existing ink, cobalt and amber identity. The product remains a marketplace for scoped research data: discover sources, approve an exact price, receive traceable data, and reuse the same owned batch. The cinematic introduction stays; the working application prioritises clear decisions.

## What needed improving

| Observation | Why it mattered | Implemented change |
| --- | --- | --- |
| The catalogue opened with a large two-line slogan. | Source inventory started too far down the screen. | A concise “Discover data” heading, larger source descriptions, clearer metadata and labelled Preview actions. |
| Dashboard actions repeated without helping a new user formulate a task. | A blank account still required the user to invent its first search. | Three editable research starting points, a focused agent connection panel and compact empty states. |
| The catalogue duplicated the workspace’s research composer. | Two places appeared to own the same task. | Catalogue links take users to the actual research workspace with explicit, editable requirements. |
| The landing story explained the concept without showing much available inventory. | Visitors could not judge the actual product quickly. | Real catalogue entries show source titles, fields, scope and price, with direct source-preview links. An immediate catalogue link also appears in the opening scene. |
| Starting-point selection could accidentally resume unrelated previous research. | The screen would contradict the choice just made. | An explicit `start` parameter starts a new scope; an explicit owned `task` parameter retains precedence. Selecting a starting point does not submit or purchase. |

Research starts cover drug approvals, drug recalls and device recalls. They use the existing structured task endpoint, not a simulated response or a model dependency. Their fields, quantity, freshness and intended use remain editable. A spending limit is still a limit; checkout requires buyer approval.

The source-preview query accepts only an offer in the public catalogue. Unknown IDs do not reveal private data. Dismissing a linked preview removes that query parameter. Prices and available examples come from the catalogue API, with existing source and licence disclosures retained.

## Reference decisions

- [Lusion v3 on Awwwards](https://www.awwwards.com/sites/lusion-v3) informed the existing scroll-driven visual story. Keep expressive motion on the public introduction; preserve reduced-motion and graphics-failure alternatives.
- [Linear](https://linear.app/) provided the strongest reference for concise hierarchy and visible product evidence. Its current homepage was inspected in Chrome. Trove retains its own typography, colours and product structure.
- [Exa](https://exa.ai/) and [Parallel](https://parallel.ai/) were read for how agent-data products explain their jobs. Their partially loaded local captures were not treated as visual quality references.

No reference assets were copied. Mobbin was not retried after the previously encountered access limitation. No paid services, new accounts or new runtime dependencies are required for this work.

## Recommended next work

The next investment should improve the repeat research loop. Adding more domain names or another chat interface is less useful until people can consistently find, buy and reuse a worthwhile batch.

| Priority | Feature | Smallest useful implementation | How to judge it |
| --- | --- | --- | --- |
| 1 | **Owned data library** | A searchable view of accessible batches, with scope, source version, original purchase, download and “Use in research”. Use existing entitlements; do not create another ownership system. | A buyer can retrieve the same batch without another payment or hunting through receipts. |
| 2 | **Saved research** | Name and save editable requirements; rerun them into a fresh quote. Keep the original task and source decisions for comparison. | A recurring investigation starts from saved scope rather than another long prompt. |
| 3 | **Source update comparison** | Show the owned version beside the available version, dated source changes, added/removed records where stable identifiers permit it, and the incremental purchase price. Approval remains explicit. | Buyers understand what changed before paying again. No automatic upgrade charge. |
| 4 | **Coverage-first comparison** | A compact comparison of required fields, matching record count, snapshot age, permitted use and exact price. Explain missing requirements alongside successful matches. | Buyers can explain why a source fits without treating a vague AI score as evidence. |
| 5 | **First agent task walkthrough** | After OAuth consent, offer one copyable research request and show actual connection/last-use status. Keep manual token setup in advanced options. | A user reaches a successful, scoped MCP request without editing code. |

These are proposals, not features represented as already shipped. The three research starting points are implemented now; persistent custom templates and update notifications are not.

## Remove or defer

- Keep duplicated entry forms and repeated instructional paragraphs out of the primary screens. Retain scope, licences, provenance and payment state where they affect a decision.
- Do not add vanity statistics, fabricated testimonials, supplier-verification badges or “live” claims without evidence.
- Defer a wallet/credits layer and automatic spending. Exact PayPal approval plus owned-batch reuse already supplies a clearer purchase model.
- Defer legal and financial inventory until suitable sources, rights, preparation and quality checks are established. Keep them labelled as future domains in the story.
- Defer autonomous provider publishing and more seller automation until the review process is exercised. Existing uploads and publication review remain intact.
- Avoid another generic chat interface. The agent selects its information needs; Trove should improve source selection, purchase clarity and delivery.

## Launch evidence still needed

A polished UI does not establish demand or prove payment settlement. Before calling this production-ready, complete a real sandbox buyer approval/capture/delivery/refund cycle, verify delivered email and password recovery, and connect actual supported agent clients through OAuth. Automated tests exercise these boundaries but do not replace external acceptance.

Run a small observed test with researchers: give each a concrete regulatory question and ask them to find an appropriate source, understand its scope and price, retrieve the result, and reuse it. Record where they hesitate and whether the prepared batch saves enough work to justify its price. The hackathon’s public data and illustrative providers must remain disclosed in the pitch; selling access to an underlying public source is not the value proposition. Preparation, bounded delivery and traceability need to earn the price.

## Review evidence

Local captures are excluded from Git at `.impeccable/review/startup-polish/`: `before/` records the starting implementation; `after/` records the first rendered pass; `final/` records the confirmation pass. Desktop, tablet, mobile and short laptop views cover the dashboard, catalogue and research path, with shared account, seller, connection and purchase surfaces also inspected. Manifests record viewport dimensions, JavaScript errors and document overflow.

See `AUDIT.md` for final check results and release status. These captures use controlled local accounts and real application APIs. No payment was executed by the visual review.
