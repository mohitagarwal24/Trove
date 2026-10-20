# UI review — 20 October 2026

Reviewed the existing application in Chrome at 1366×768 and 390×844, with an additional 1366×610 laptop check. The implementation preserves the ink/cobalt/amber identity and real account, search, licensing and payment services. This is an application refinement, not a new demo or a replacement website.

## Findings and resulting changes

1. **Long values overwhelmed results.** The inspected three-record device batch produced a 10,490px desktop page. Native expandable values now keep the same page near 1,500px, while retaining exact full values and JSON download. Firm and product columns keep readable minimum widths; tables scroll within the result surface.
2. **Forms were too small and sparse.** Labels were often 10px and simple profile actions stretched across an entire panel. Shared controls now have 12px labels, 13px input text, 44px actions, password visibility controls and consistent focus. Account groups related identity settings; Connect uses a compact access row and a configuration/example layout.
3. **Sign-in lacked recognizable provider branding.** Google sign-in and explicit linking now use the official full-color G and a locally hosted 4KB Google Sans subset, with its licence and source provenance. Authentication behavior is unchanged.
4. **Repeated explanations competed with the work.** Removed repeated provider labels, generic setup steps, decorative header chrome and redundant purchase copy. Transaction references and integrity fingerprints remain available on demand. Entirely owned plans link directly to existing data without expiry, fee totals or checkout buttons. Required scope, source licence, provenance, refund effects and Sandbox identification remain where a decision needs them.
5. **Motion did not explain navigation and scrolling.** A scroll-position line and utility-bar depth preserve orientation. Source inventory and new decision rows unfold without moving financial values. Shared route, hover, selection, menu, field and dialog feedback form one short motion language. Reduced-motion preferences cancel the scripted reveals and remove spatial CSS animation. Content remains visible when motion is unavailable.
6. **Long dialogs lost context.** The heading and close control now stay in place while the body scrolls. The publishing action remains reachable on a 390×700 viewport. Mobile sign-in from the account menu closes the navigation drawer first.
7. **Category changes could briefly show the previous category.** Categories now filter available public metadata immediately; text search still uses the server search pipeline. A regression check ensures the previous category never remains clickable.
8. **Seller inventory clipped the first column.** The independent review caught obsolete negative table margins. Removing the expansion restores complete dataset names and record counts; a positioned scroll container keeps the hidden action label from extending the mobile page. Desktop and mobile recaptures have no document overflow.

## Capture coverage

The captures are private local review evidence under `.local/ui-polish/before/` and `.local/ui-polish/after/`, excluded from Git. Each screenshot was inspected directly or in its full-state contact sheet. The final capture set covers these steps:

| Step | Screen or state         | Final health                                 | Capture                          |
| ---- | ----------------------- | -------------------------------------------- | -------------------------------- |
| 1    | discover                | Checked                                      | `01-discover.png`                |
| 2    | sign in                 | Checked                                      | `02-sign-in.png`                 |
| 3    | register                | Checked                                      | `03-register.png`                |
| 4    | source approvals        | Checked                                      | `04-source-approvals.png`        |
| 5    | source drug recalls     | Checked                                      | `05-source-drug-recalls.png`     |
| 6    | source device recalls   | Checked                                      | `06-source-device-recalls.png`   |
| 7    | password recovery       | Checked                                      | `07-password-recovery.png`       |
| 8    | new password            | Checked                                      | `08-new-password.png`            |
| 9    | privacy                 | Usable; required disclosures retained        | `09-privacy.png`                 |
| 10   | terms                   | Usable; required disclosures retained        | `10-terms.png`                   |
| 11   | workspace empty         | Checked                                      | `11-workspace-empty.png`         |
| 12   | workspace sources       | Checked                                      | `12-workspace-sources.png`       |
| 13   | purchases               | Checked                                      | `13-purchases.png`               |
| 14   | purchased data          | Checked                                      | `14-purchased-data.png`          |
| 15   | receipt                 | Checked                                      | `15-receipt.png`                 |
| 16   | delivery checks         | Checked                                      | `16-delivery-checks.png`         |
| 17   | refund                  | Checked                                      | `17-refund.png`                  |
| 18   | purchase approval       | Checked                                      | `18-purchase-approval.png`       |
| 19   | purchase stopped        | Checked                                      | `19-purchase-stopped.png`        |
| 20   | account                 | Checked                                      | `20-account.png`                 |
| 21   | close account           | Checked                                      | `21-close-account.png`           |
| 22   | connect                 | Checked                                      | `22-connect.png`                 |
| 23   | create token            | Checked                                      | `23-create-token.png`            |
| 24   | token ready             | Checked                                      | `24-token-ready.png`             |
| 25   | provider onboarding     | Checked                                      | `25-provider-onboarding.png`     |
| 26   | provider pending        | Checked                                      | `26-provider-pending.png`        |
| 27   | publish dataset         | Checked                                      | `27-publish-dataset.png`         |
| 28   | seller studio           | Checked                                      | `28-seller-studio.png`           |
| 29   | update offer            | Checked                                      | `29-update-offer.png`            |
| 30   | review price            | Checked                                      | `30-review-price.png`            |
| 31   | review owned            | Checked                                      | `31-review-owned.png`            |
| 32   | email verification      | Checked                                      | `32-email-verification.png`      |
| 33   | mobile discover         | Checked                                      | `33-mobile-discover.png`         |
| 34   | mobile navigation       | Checked                                      | `34-mobile-navigation.png`       |
| 35   | mobile sign in          | Checked                                      | `35-mobile-sign-in.png`          |
| 36   | mobile account          | Checked                                      | `36-mobile-account.png`          |
| 37   | mobile purchase         | Checked                                      | `37-mobile-purchase.png`         |
| 38   | mobile publish          | Checked                                      | `38-mobile-publish.png`          |
| 39   | Sign-in at 1366×610     | Entire dialog fits                           | `39-short-laptop-sign-in.png`    |
| 40   | Navigation at 1366×610  | Callout and profile remain reachable         | `40-short-laptop-navigation.png` |
| 41   | Mobile seller inventory | Complete first column, internal table scroll | `41-mobile-seller-studio.png`    |

## Independent finish review

The independent review returned `disposition: fix` for the seller inventory’s clipped first column. After correction, it scored that finding resolved with no visible regressions and returned `disposition: ship`, covering the scored seller fix. The initial full review found no other material fixes across the forty supplied states; the final packet adds the mobile seller check. Documentation verification confirmed the correction restores the recorded system without new tokens or narrative changes.

## Verification and limits

- Production build and TypeScript pass. All 59 backend checks pass. All 20 browser checks pass across the full run and a targeted confirmation after settling the dialog's entrance animation before measuring its heading. The earlier measurement differed by 0.32px while the animation was still in flight; no layout change was needed.
- Additional Axe checks report no serious/critical violations on Discover, workspace, purchases, Account, Connect, privacy, terms, the purchased-data fixture, sign-in and refund. This is automated evidence, not accessibility certification.
- The native expanded value was compared with the actual scoped result payload and matched exactly. Receipt references remain reachable. No inspected page has horizontal document overflow; wide data tables keep their own scrolling surface.
- The screenshots of payment-dependent states use isolated **local test fixtures**, with real source records, restricted private accounts and controlled financial status. No payment was approved, captured or refunded, no seller offer was changed, and no AI request or email was sent during this UI review. These fixtures introduce no production flag, fake checkout or canned product response. A zero-total pending fixture was rejected and replaced with a valid nonzero quote before final verification.
- Actual external Google consent, email delivery and PayPal transaction acceptance are separate integration checks. This work does not claim them. All six Google/mail values are present on the hosted service; no secret value was displayed or changed.
- Mobbin reference retrieval was blocked because its MCP connector requires a paid plan. No upgrade or paid resource was used. Impeccable and Product Design guided the audit and refinement.
- The Google Sans font finding was resolved by documenting its intentional provider-brand role; no new hook ignore was added. The existing narrow Inter exception remains.
