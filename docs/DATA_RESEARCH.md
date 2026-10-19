# Initial data products

Reviewed 19 October 2026. Choose regulatory intelligence for the first catalogue: drug approval dossiers, drug recall intelligence and medical device recalls, each with a compact index alternative. These support commercial research workflows without handling patient-level records or pretending to offer clinical advice.

## Sources and rights

| Source                                                                  | Useful fields                                                    | Initial import                                             |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| [Drugs@FDA](https://open.fda.gov/apis/drug/drugsfda/)                   | Application, sponsor, product, ingredients, route, approval date | 100 source applications, up to 200 normalized product rows |
| [Drug enforcement reports](https://open.fda.gov/apis/drug/enforcement/) | Recall reason, severity, status, firm, report dates              | 100 recent reports                                         |
| [Device recalls](https://open.fda.gov/apis/device/recall/)              | Event, product code, manufacturer, root cause, action            | 100 recent events                                          |

The [FDA licence](https://open.fda.gov/license/) generally permits commercial reuse under CC0, with exceptions for third-party material. GMDN fields have separate restrictions and are explicitly excluded from ingestion. The [terms](https://open.fda.gov/terms/) request attribution and prohibit implied endorsement. Each product preserves its source URL, licence URL, attribution, actual source update date, retrieval time and content hash. No claims of FDA affiliation or clinical validation are made.

[Bounded API requests can run without a key](https://open.fda.gov/apis/authentication/). Scheduled imports make three allowlisted requests daily, preserve unchanged snapshots and retain the last successful data on failure. An empty or failed response never creates generated rows or fabricated freshness. Current records are bounded batches, not an exhaustive FDA corpus. Product counts may change with source responses; offers state their maximum delivery quantity.

## Why pay for this?

The commercial product is preparation and delivery: normalize nested records, select needed fields, filter a research question, fix a version, enforce usage scope, and provide one receipt. Charging does not remove the customer's rights in the underlying public-domain source. Public previews are deliberately small; a paid delivery is an actual scoped batch.

These are useful research ingredients, but willingness to pay remains unvalidated. A buyer can obtain the raw source for free. The next business validation should compare manual preparation time against Trove with 5–10 regulatory analysts, then test repeated purchases. Do not describe the catalogue as exclusive or imply that raw FDA access requires payment.

## Alternatives considered

- **SEC company filings/XBRL:** valuable for financial research, but an accurate product needs amendment/restatement handling, issuer mapping and careful fair-access ingestion. [SEC developer resources](https://www.sec.gov/about/developer-resources) require an identifiable user agent and describe access limits. It is not a real-time stock-price feed. Good next vertical after proving the regulatory workflow.
- **CourtListener legal data:** useful, but [API access guidance](https://wiki.free.law/c/courtlistener/help/api) includes commercial access arrangements. Do not assume public web access grants a free commercial API or redistribution agreement.
- **Clinical trial records:** potentially useful but source-specific reuse terms and completeness need a separate review. Not included in this launch.

This selection avoids paid subscriptions and unverified data-resale claims. Real provider contracts, broader coverage, quality evaluation and customer demand remain business work beyond implementing the transaction mechanism.
