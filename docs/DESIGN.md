---
name: Trove
description: A quiet, source-led research workspace with explicit scope and purchase decisions.
colors:
  primary: "#202124"
  primary-hover: "#383b3f"
  surface: "#ffffff"
  sidebar: "#fafafa"
  muted: "#62666d"
  supporting: "#626b78"
  line: "#e6e7e9"
  panel-line: "#e4e7ea"
  field-line: "#dce1e6"
  accent: "#4276d1"
  selected-surface: "#f4f7fb"
  scope-surface: "#f7f8fa"
  success: "#3d6853"
  success-surface: "#f1f8f3"
  error: "#923f35"
  error-surface: "#fff6f4"
  night: "#121416"
  landing-ground: "#fafbfb"
  landing-line: "#e3e5e6"
  landing-muted: "#686d73"
typography:
  display:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "clamp(48px, 6.2vw, 82px)"
    fontWeight: 500
    lineHeight: 1.04
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "30px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "14px"
    lineHeight: 1.75
  action:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.35
  label:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 500
  evidence:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "12px"
    lineHeight: 1.75
  identifier:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
  google-sign-in:
    fontFamily: "Google Sans, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.35
rounded:
  tag: "4px"
  badge: "5px"
  navigation: "6px"
  control: "7px"
  scope: "8px"
  panel: "10px"
  dialog: "12px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  panel: "23px"
  content: "24px"
  section: "30px"
  desktop-gutter: "36px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "#454a51"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  form-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    padding: "11px"
  navigation-active:
    backgroundColor: "#e9ebee"
    textColor: "{colors.primary}"
    rounded: "{rounded.navigation}"
    padding: "11px 10px"
  offer-tag:
    backgroundColor: "#f0f2f5"
    textColor: "{colors.supporting}"
    rounded: "{rounded.tag}"
    padding: "3px 6px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.panel}"
    padding: "23px"
  scope-summary:
    backgroundColor: "{colors.scope-surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.scope}"
    padding: "21px 24px"
  landing-action:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.scope}"
    padding: "12px 18px"
  google-sign-in:
    backgroundColor: "{colors.surface}"
    textColor: "#1f1f1f"
    typography: "{typography.google-sign-in}"
    rounded: "{rounded.control}"
    padding: "11px 12px"
---

# Design System: Trove

## Overview

**Creative North Star: "The Source Workspace"**

Trove places source evidence and the next decision inside a quiet, precise interface. White fields, pale neutral navigation, fine rules and compact Inter typography adapt the user’s chosen Attio references to a working research marketplace. The Trove name, mark, actual catalogue and account flows remain the identity and content.

The public page gives product evidence room to breathe; the application uses the same material at higher density. Restrained blue identifies focus and selected scope, while charcoal carries primary actions. The dark connection passage is a bounded procedural illustration, never a financial status display.

**Key Characteristics:**

- White and pale gray surfaces separated by fine rules.
- Charcoal primary actions and restrained blue focus and selection.
- Locally hosted Inter across public and working surfaces.
- Divided source inventory, explicit scope and tabular USD amounts.
- Compact sample records with readable fields and named native disclosures for supporting detail.
- Native scrolling, readable fallback content and reduced-motion support.

This record replaces the earlier Technical Atlas/Data Convergence system under the user-pinned replacement contract in `.impeccable/surfaces/trove-reference-revamp.md`. Values are extracted from the built styles in `src/app/globals.css` and `src/app/landing.css`; the reference extraction is evidence, not Trove’s token source. Surface composition belongs in the adjacent surface briefs. Review status belongs in the finish report, not this system record.

## Colors

The palette is predominantly neutral, with blue restricted to functional emphasis.

### Primary

- **Reading Charcoal** (`primary`): headings, primary copy and primary action fills; **Hover Charcoal** (`primary-hover`) is the working button hover.
- **Functional Blue** (`accent`): visible focus, interactive emphasis and restrained selection cues; selected source cells use **Selected Paper** (`selected-surface`).

### Neutral

- **White Surface** (`surface`) and **Pale Navigation** (`sidebar`): working canvas, panels and navigation.
- **Graphite Secondary** (`muted`) and **Supporting Slate** (`supporting`): global secondary copy and the reused working-detail color respectively. Both are real source values, not interchangeable aliases.
- **Fine Rule** (`line`), **Panel Rule** (`panel-line`) and **Field Rule** (`field-line`): structure and input edges.
- **Scope Paper** (`scope-surface`): scope summaries, facts and quiet working details.
- **Public Ground**, **Public Rule** and **Public Secondary** (`landing-ground`, `landing-line`, `landing-muted`): the public frame and larger typographic contrast.
- **Connection Night** (`night`): the isolated source-connection passage.

Green and red, with their pale surfaces, identify actual success and error notices. They are semantic states rather than brand accents.

**The Action Hierarchy Rule.** Charcoal carries primary decisions; blue supports focus, links and selection. Status colors communicate actual state and always retain text.

## Typography

**Display and body font:** locally hosted Inter, with Arial and sans-serif fallbacks. Retaining Inter is intentional: its compact proportions serve real source tables and match the user’s chosen reference direction. It is the unified heading and body family, not a default display fallback. Manrope is removed.

**Identifier font:** the system monospace stack for hashes, tokens and configuration. **Google sign-in only:** the existing local Google Sans Medium subset and unchanged official Google G are provider identity assets; their use does not extend to Trove headings or controls. The bundled Google Sans OFL remains in `public/fonts/GOOGLE-SANS-OFL.txt`.

### Hierarchy

- **Display:** the frontmatter desktop role; mobile uses `clamp(44px, 11vw, 70px)`. Public chapter headings are (24px), becoming (21px) on mobile. Large section headings range from (29px) to (68px) by role.
- **Headline:** working pages use the frontmatter role, becoming (27px) up to (760px). Authentication uses (30px), then (28px); recovery uses (29px).
- **Title:** source titles use the frontmatter role; panel titles use (16–17px). Supporting title weight is (500), not a heavy display weight.
- **Body:** the global baseline is the frontmatter role. Page descriptions and form values use (13px); source descriptions and detailed rights/checks use (12px). Source descriptions wrap at approximately (55ch).
- **Action and label:** use the frontmatter roles; public actions use (13–14px). Mobile form values become (16px) to remain readable and avoid focus zoom. Existing small utility metadata is descriptive legacy detail, not a body-size recommendation.
- **Financial values:** tabular numerals; source prices use (21px) on desktop and (22px) on mobile, comparison totals (22px), purchase totals (25px).

**The Stable Amount Rule.** Use tabular numerals and explicit USD context for prices, limits and totals.

## Layout

The working shell uses a light fixed rail (216px), an optional desktop icon rail (68px), a utility bar (60px), and a main region with a (1450px) maximum width and (35px 36px 52px) padding. Up to (1100px), gutters become (26px). Up to (760px), the rail becomes a full-content drawer (248px), the shell margin clears, the bar becomes (57px), and content uses (27px 18px 35px) padding. Navigation has a scrolling middle and separate account footer for short screens; a collapsed rail retains accessible names.

Source inventory is a shared bordered two-column grid with divided cells; up to (760px), it becomes one column. The research workspace is a centered single column with a (960px) maximum; a new research composer uses a narrower (760px) maximum. Output appears after an actual request, with an editable scope summary above it. Narrow summaries stack their edit control. Purchased results use the available content width, followed by a collapsed Order details group. Dashboard starting points become divided rows up to (950px); recent research and purchased-data groups appear only when they contain records. On mobile the agent callout uses an icon and flexible text row, then the action beneath the text. Account and connection groups stack without removing management controls.

Public content uses a centered ruled frame (1280px), a sticky header (76px; mobile 66px), a real catalogue browser and native document chapters. The chapter index is sticky beside content on desktop and becomes a horizontal sticky strip on mobile. Public gutters range from (18px) on mobile to (54px) in spacious sections. Sign-in centers the working form at a (400px) maximum; recovery uses a (520px) content maximum without the application rail.

## Elevation & Depth

Ordinary panels are flat: pale surfaces, fine one-pixel rules and restrained selected fills establish hierarchy. Buttons have a small soft shadow; menus, dialogs, toasts and the comparison tray float above their source context.

### Shadow Vocabulary

- **Primary control:** `0 1px 2px #00000010`; hover `0 2px 5px #00000014`.
- **Menu:** `0 8px 22px #10182014`.
- **Comparison tray:** `0 8px 30px #18243a20`.
- **Dialog:** `0 16px 65px #11182026`, with a translucent blurred overlay.

**The Ruled Surface Rule.** Use pale fills and fine borders to group ordinary content. Reserve stronger shadows for floating controls and overlays.

## Shapes

Compact rounded controls and gently rounded groups share straight structural rules. Tags use the tag radius, navigation uses the navigation radius, forms use the control radius, scope/fact groups use the scope radius, ordinary panels use the panel radius, and dialogs use the dialog radius. Inventory cells have square shared edges inside the rounded outer group. The circular connection center belongs to the public illustration rather than ordinary cards.

## Components

### Buttons

Charcoal primary and white bordered secondary controls use the frontmatter primitives, with a (40px) minimum height. Smaller actions use (34px). Hover changes fill and border with restrained depth; disabled controls reduce opacity and block interaction. Visible focus is a blue (2px) outline with (4px) offset. Public actions use the larger landing primitive and a (1px) upward hover response.

### Inputs / Fields

White fields use the field rule, the control radius, (13px) desktop values and a (42px) minimum height. Focus shifts the border to `#7e9dc9` and adds `0 0 0 2px #4276d112`; mobile values use (16px). Search is (44px) high. Errors remain adjacent, textual and readable.

### Navigation

Compact line icons and (12px) sentence-case route text sit on the pale rail. Hover uses a pale neutral fill; the current route has a stronger neutral fill and charcoal text. The mobile drawer preserves full labels; desktop collapse keeps icons, accessible names and account access. Authentication and recovery use a focused brand header. Repeated sidebar promotion has been removed.

The active rail item and page heading carry desktop route identity without a duplicate utility-bar breadcrumb. Mobile retains the compact route label beside the drawer control. A fine divider separates working routes from seller and agent tools.

### Chips / Tags

Source fields use pale neutral tags with a fine border and the tag radius. Readable labels explain fields and purposes; technical API identifiers remain in submitted data. Status badges keep text alongside color.

### Cards / Containers

Panels use the flat panel primitive; source inventory cells use fine shared dividers and (25px) desktop padding, becoming (22px 20px) on mobile. Selected offers use Selected Paper and an inset `#9bb4d9` stroke. Native disclosures hold optional detailed scope, source rights and long identifiers without removing their content.

### Disclosures

Native details and summary elements expose supporting information by name. Shared summaries use (13px), medium weight and a (1.6) line height, with (10px) vertical padding. Optional summary context uses (12px) regular text; up to (760px), that context moves beneath the label. Hover strengthens the text color, and an open summary gains space before its content. Keep the action, exact price and current payment/delivery state visible outside the disclosure. Search options, source rights, quote breakdowns, setup help and account security use this existing pattern.

### Sample records

Source previews use compact labelled records rather than a wide table. Each record leads with its sample number, a safe View source link when available, and four useful primary fields. All sample fields exposes the remaining values; long values retain their own native disclosure. Labels use (12px) secondary text and values use (13px) text with wrapping. Records form two columns with a (28px) gap, becoming one column up to (600px). The same preview serves catalogue inspection and read-only source inspection from research comparison; returning to comparison does not change its selection.

### Scope and source decisions

A completed research request replaces the expanded composer with a scope summary and an explicit Edit requirements action. Source decisions are divided rows with coverage, actual price and source details. Editing material requirements invalidates the next purchase review until discovery is refreshed. Model summary appears only when AI is configured or a saved answer exists; missing configuration is not decorative output. On an unconfigured new request, the unavailable brief-mode switch is omitted.

The composer keeps category, record count and spending limit visible while Search options retains freshness, intended use, fields and filters. Selected sources lead the comparison; other sources remain in a named disclosure when there is a selection. Purchase review keeps its exact USD total, purpose, expiry and approval action visible while scope, price breakdown and source licences remain expandable. Purchased rows lead the result view; usage terms, receipt evidence and order details remain available at their named locations. Processor identifiers stay inside Transaction references. A purchase issue uses a category, specific description and optional evidence link; the action is Send for review. Case history is expandable, while a request for more information stays visible above the result with an Add information action. Filing an issue does not represent an approved or completed refund. A voided purchase identifies itself as closed and offers Review sources, reopening the prior scope when available.

### Inline agent view

The MCP Apps view extends the source-led pattern within the host's theme, typography variables and safe-area insets. Its light and dark fallback styling is local to that embedded surface, not a replacement application palette. Selected source, exact USD total and the next action remain visible; representative fixed samples, other sources and licence/price detail use native disclosures. Requested fields lead sample records, with safe original-record links and a narrow one-column layout. The view states that PayPal approval opens on Trove and checkout inside chat is not enabled before preparing a purchase. Owned retrieval and purchase-support case history retain their actual permission and payment state.

### Public source and connection scenes

Source selection updates the inspector from real bootstrap catalogue metadata; chapters use functional anchors and actual scroll position. The connection drawing is a native 2D canvas with bounded lines (24 desktop, 12 mobile), capped pixel ratio (1.5), and paused rendering offscreen or while the document is hidden. Reduced motion skips the drawing import and retains a static line fallback. Working feedback uses (160ms), arrival (260ms), exit (110ms) and exponential ease-out; reduced motion cancels spatial and continuous effects. Every chapter remains readable in document flow.

## Do's and Don'ts

### Do:

- **Do** retain readable source rights, attribution, scope and independent payment and delivery states at the point of decision.
- **Do** show human field and purpose labels while preserving submitted API values.
- **Do** stack actions beneath content when a narrow viewport needs the reading width.
- **Do** preserve visible focus, native disclosures and static reduced-motion content.

### Don't:

- **Don’t** transfer reference logos, CRM content, testimonials or customer metrics into Trove.
- **Don’t** restore the superseded ink rail, cobalt primary actions, amber marketing accents or Manrope display system.
- **Don’t** use ornamental eyebrows or miniature evidence text as reusable primitives.
- **Don’t** illustrate a successful model request, payment or entitlement as though it happened.

Inherited miniature utility labels and remaining eyebrow-styled utility captions are not canonized as reusable typography. They are existing implementation residue, not permission to add new decorative labels. Current source-rights captions and delivery checks use the readable evidence role.
