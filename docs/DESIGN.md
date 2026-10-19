---
name: Trove
description: A technical atlas for discovering research sources and approving exact-price access.
colors:
  canvas: "#f5f6f9"
  surface: "#fff"
  sidebar: "#171d30"
  ink: "#20283f"
  muted: "#626c82"
  faint: "#69738a"
  line: "#dde1eb"
  accent: "#3155d9"
  accent-dark: "#2441af"
  highlight: "#f5d683"
  research-paper: "#fcf0d5"
  research-line: "#ead7aa"
  selected-surface: "#f1f4ff"
  success: "#23694d"
  success-surface: "#eaf5ee"
  error: "#9c4539"
typography:
  display:
    fontFamily: "Manrope, Inter, Arial, sans-serif"
    fontSize: "44px"
    fontWeight: 700
    lineHeight: 1.13
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Manrope, Inter, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 650
    letterSpacing: "-0.4px"
  title:
    fontFamily: "Manrope, Inter, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 650
    lineHeight: 1.45
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "13px"
  label:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 550
    lineHeight: 1.35
  identifier:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
rounded:
  tag: "4px"
  control: "8px"
  search: "9px"
  dock: "12px"
  offer: "13px"
  panel: "14px"
  dialog: "16px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  panel: "23px"
  section: "26px"
  page-top: "32px"
  desktop-gutter: "38px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
  button-primary-hover:
    backgroundColor: "{colors.accent-dark}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "#34415f"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
  search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.search}"
    padding: "0 12px"
    height: "46px"
  navigation-active:
    backgroundColor: "#354fbb"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "11px 12px"
  offer-tag:
    backgroundColor: "#f4f5f9"
    textColor: "#5d6881"
    rounded: "{rounded.tag}"
    padding: "3px 6px"
  offer-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.offer}"
    padding: "20px 20px 0"
  offer-card-selected:
    backgroundColor: "{colors.selected-surface}"
  research-composer:
    backgroundColor: "{colors.research-paper}"
    textColor: "#42351f"
    rounded: "{rounded.panel}"
    padding: "23px 20px 17px"
  comparison-dock:
    backgroundColor: "#202c4d"
    textColor: "{colors.surface}"
    rounded: "{rounded.dock}"
    padding: "12px 15px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "23px"
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.dialog}"
    padding: "26px"
---

# Design System: Trove

## Overview

**Creative North Star: "The Technical Atlas"**

Trove is a working research marketplace: an ink navigation rail establishes orientation, chalk surfaces hold the source inventory, cobalt marks selection and action, and amber gives the research question its own place. The result is compact, orderly, and specific to a tool for investigating data.

The approved replacement of the former green identity retains the existing application, local fonts, and product disclosures. Source scope, permissions, exact USD prices, and human approval must remain legible alongside the synthetic-fixture and sandbox context. The system uses functional line icons and CSS geometry; it does not depend on raster imagery or invented provider relationships.

**Key Characteristics:**
- Persistent ink navigation with reachable account and agent controls.
- Cobalt actions and selection against quiet white inventory panels.
- An amber question composer separated from source browsing.
- Manrope headings, Inter controls, and tabular financial values.
- Flat information surfaces with depth reserved for controls and overlays.

The normative values above describe the current cascade in `src/app/globals.css`. This document is the system record; the surface brief in `.impeccable/surfaces/src-components-discover-tsx.md` owns the Discover composition.

## Colors

Cool ink and cobalt organize the interface; amber identifies the research surface and sandbox context.

### Primary

- **Atlas Cobalt** (`accent`): purchase and research actions, active filters, checked selections, links, and the second phrase of page headings. **Deep Cobalt** (`accent-dark`) is its primary-button hover state.

### Secondary

- **Amber Marker** (`highlight`): the brand period on the ink rail, agent connection link, and primary action inside the dark comparison dock.
- **Research Paper** (`research-paper`) and **Research Rule** (`research-line`): the question composer and its containing stroke. The textarea uses an even lighter warm inset.

### Neutral

- **Chalk Canvas** (`canvas`) and **White Surface** (`surface`): the application background and working panels.
- **Navigation Ink** (`sidebar`): the persistent rail; its inset controls use lighter ink tones and pale text.
- **Reading Ink** (`ink`): primary content. **Slate Text** (`muted`) and **Secondary Slate** (`faint`) support contextual copy.
- **Cool Rule** (`line`): panel edges and structural dividers. **Selected Paper** (`selected-surface`) pairs with a cobalt border and inset stroke for selected offers.

Success green belongs to confirmed status badges and success notices. Error red belongs to error copy and error states. Neither is a brand accent. Every state also carries text or an icon with an accessible name.

**The Action Cobalt Rule.** Use cobalt to express an action, selection, or the established heading emphasis; preserve amber for its research, navigation-highlight, and sandbox roles.

## Typography

**Display Font:** locally hosted Manrope, falling back to Inter and Arial.
**Body Font:** locally hosted Inter, falling back to Arial.
**Identifier Font:** the system monospace stack for hashes, tokens, configuration, and keyboard hints.

Manrope adds rounded, confident headings while Inter preserves the dense working rhythm of controls and metadata. Retaining Inter is intentional in this operate-mode implementation.

### Hierarchy

- **Display:** the frontmatter role governs the main Discover heading. It becomes (38px) at widths up to (1050px) and (36px) up to (760px). Compact route headings use (36px), then (34px), then (32px) at the same breakpoints.
- **Headline:** section headings start with the frontmatter role; catalogue and panel titles often use (15px). The amber composer's question uses (27px), weight (650), line height (1.3), and tracking (-0.03em); at widths between (761px) and (1250px), it uses (24px).
- **Title:** offer titles use the frontmatter role, become (16px) up to (1250px), and (18px) up to (760px).
- **Body:** the application base is the frontmatter body role. Page descriptions use a maximum width of (65ch) and line height (1.8). Offer descriptions use (11px) and line height (1.75), becoming (12px) on mobile.
- **Label:** the frontmatter label role describes standard buttons; small buttons use (11px). Sidebar links use (12px), increasing to (13px) on mobile.
- **Financial values:** use tabular numerals on offer prices, metrics, budgets, quote totals, summary totals, and amount columns. Offer prices use (22px).

**The Stable Amount Rule.** Financial values retain tabular numerals and an explicit USD context; changes in value must not shift a comparison column's rhythm.

Inherited compact metadata and uppercase utility labels remain in secondary screens. Their smallest sizes and eyebrow treatment are not canonical primitives for new work.

## Layout

The fixed rail is (232px) wide, matched by the main shell's left margin. At widths up to (1250px), both become (208px). The rail uses (100dvh): its brand and account footer do not shrink, and the middle region has `min-height: 0` with vertical scrolling. The agent callout lives inside that scrollable region, so “Your agent. Better informed.” stays reachable on shorter laptops. At desktop heights up to (820px), rail padding and gaps compress; up to (700px), the callout icon hides and copy spacing tightens. Account controls remain outside the scroll region.

The utility bar is (64px) tall. Main content is centered with a maximum width of (1510px), desktop horizontal gutters of (38px), top padding of (32px), and bottom padding of (55px). Up to (1250px), horizontal gutters become (25px) and bottom padding (45px). Up to (760px), gutters become (20px) and the utility bar (61px); up to (460px), gutters become (16px).

Discover has a flexible inventory plus a (294px) composer column, separated by (26px). At (1600px) and above, the composer becomes (320px) with a (32px) gap. Up to (1250px), it becomes (260px) with a (20px) gap. Up to (1050px), the composer group moves below the inventory and uses a (1.5fr / 1fr) internal grid; up to (460px), that group becomes one column. Offers use two equal columns and a (16px) gap, collapsing to one column up to (460px). Category tabs scroll horizontally rather than wrap.

Workspace uses a (350px) composer beside flexible output, becoming (300px) up to (1250px) and one column up to (1050px). Connect uses a flexible main column and (300px) aside, then (270px), then one column at the same breakpoints. Purchase details similarly collapse their summary aside at (1050px). Data tables preserve columns inside horizontally scrollable containers.

Up to (760px), the rail becomes a drawer of `min(288px, 86vw)`. It opens above a backdrop, makes the main shell inert, locks body scrolling, traps keyboard focus, closes on Escape, and restores focus. Closed mobile navigation is inert. Retain its labelled dialog and modal semantics when open. A skip link precedes the shell.

**The Reachable Rail Rule.** Preserve the scrollable middle and pinned account footer; never make navigation depend on a tall viewport or reduced browser zoom.

## Elevation & Depth

White panels and offer cards rest on borders and tonal separation. Hover changes an offer's border without lifting the card. Selected offers add a cobalt inset stroke. Primary buttons have a small ambient shadow; menus, the comparison dock, and dialogs carry the deeper shadows that explain their position above working content.

### Shadow Vocabulary

- **Primary control:** `0 3px 7px #233f9915`; hover uses `0 4px 12px #233f9925`.
- **Search focus:** `0 3px 12px #3155d919`, paired with the focused border.
- **Account menu:** `0 12px 35px #10182d26`.
- **Comparison dock:** `0 12px 32px #18233a30`.
- **Dialog:** `0 28px 100px #0b122230`; its scrim uses blur (5px).

**The Flat Inventory Rule.** Keep inventory cards flat on hover; use border and selection treatments to communicate interaction.

The comparison dock arrives with a (240ms) upward settling motion using `cubic-bezier(0.16, 1, 0.3, 1)` and a (10px) initial offset. Controls transition mainly over (180ms); pressed buttons move down (1px). The mobile drawer slides over (200ms); dialogs fade and settle over (160–200ms). Full-page entrance animation is disabled. Reduced-motion preferences disable animations, transitions, and smooth scrolling; preserve that behavior for new components.

## Shapes

Use softly squared forms with thin rules. Tags have the smallest radius; standard controls, search, offers, panels, the dock, and dialogs use the distinct radius roles in frontmatter. Borders are generally (1px). A selected offer adds an inset (1px) cobalt stroke rather than a hard offset shadow. Provider identities are compact rounded monograms with distinct cobalt, blue, or sand tints; they represent fictional fixture providers.

The Connect example brief uses a uniform (1px) border around its light inset. Do not turn it into a decorative thick quote rail. Circles belong to avatars, state dots, and the existing workspace connection illustration.

## Components

### Buttons

Clear, compact actions with an (8px) radius and standard minimum height of (41px). Primary buttons use cobalt and white, deepen on hover, and shift down on press. Secondary buttons use white with a pale cool stroke; hover uses a pale cobalt fill and stronger stroke. Small buttons have a (33px) minimum height. Disabled buttons reduce opacity to (0.48) and show a not-allowed cursor. Keyboard focus uses a (2px) outline in `#5378ff`, offset by (4px).

### Chips

Offer tags use a pale cool fill, thin border, small radius, and compact padding. They describe content rather than acting as filters. Category tabs are separate controls: the selected tab has cobalt text, a (2px) bottom rule, and a tinted count. Freshness has a visible pressed state and count. Preserve `aria-selected` or `aria-pressed` alongside these treatments.

### Cards / Containers

Offer cards pair a provider identity and selection control with title, scope copy, tags, freshness/region metadata, and a divided price footer. Standard cards use frontmatter padding and a minimum height of (285px) across the current cascade. At widths up to (1250px), padding becomes (18px 17px 0); up to (760px), it becomes (21px 20px 0). Selected cards use tinted paper plus cobalt border and inset stroke. Generic panels use the panel radius and padding roles, with (19px) padding up to (1250px). Purchase and seller tables retain their data hierarchy and scroll container.

### Inputs / Fields

Search is a (46px) white field with an inline search icon and optional keyboard hint. Focus changes its border and adds the restrained shadow in Elevation. The slash shortcut focuses search; clear search has an accessible label. Normal forms use visible labels, cool inset fills, (1px) borders, and (7–8px) radii. Research textareas resize vertically. Search must continue querying public offer metadata only; its visual affordance must not imply access to paid payloads.

### Navigation

The rail uses pale text on ink. Hover lightens the inset; the active route uses cobalt with white text and `aria-current="page"`. The callout uses a lighter ink panel, amber icon/link, and readable supporting text. Profile settings stay pinned at the rail foot; the account menu opens upward. Preserve the drawer and height behavior described in Layout.

### Research Composer

The amber composer is a functional question surface with a large Manrope prompt, warm inset textarea, explicit approval reminder, cobalt submit action, capability-dependent live-agent or guided-demo label, and example prompts. Its heading leads directly without a decorative eyebrow. Suggestions remain controls with a subtle warm hover fill and a short arrow movement.

### Comparison Dock

Selecting sources reveals a fixed dark-ink dock with selection count, exact combined price, clear action, and amber review action. At desktop it aligns to the content area (left 270px, right 38px, bottom 23px), shifting to (233px / 25px) up to (1250px). Mobile uses (16px) side and bottom insets. The arrival motion makes selection visible; reduced motion removes it. It remains a review step before immutable quote approval.

### Dialogs and Operational States

Dialogs are centered white surfaces with (16px) corners, (26px) padding, a maximum height of (88vh), and scrolling content. Standard width is `min(480px, calc(100vw - 32px))`; wide dialogs use (710px) instead of (480px). Keep labelled dialog semantics, focus trapping, focus restoration, Escape dismissal, and explicit close controls.

Loading, empty search, connection failure, expired quote, unavailable integration, and uncertain-payment states retain their recovery controls and explanatory text. Workspace distinguishes guided demonstration from live AI. Purchases show payment, fulfilment, and settlement independently; PayPal Sandbox and Simulation have separate labels and actions. Seller earnings are distinct from payouts; voids are distinct from refunds. Connect distinguishes configured capabilities from tested integrations and exposes scoped token creation/revocation. Do not remove these disclosures to simplify a screen.

## Do's and Don'ts

### Do:

- **Do** preserve ink navigation, cobalt actions, and the amber research surface across routes.
- **Do** keep the rail callout and account controls reachable at normal zoom and short laptop heights.
- **Do** use local Manrope headings, Inter body copy, and tabular financial values.
- **Do** pair state color with text, preserve visible keyboard focus, and honor reduced motion.
- **Do** keep exact-price approval, synthetic fixtures, sandbox/simulation labels, permissions, and source provenance visible where relevant.

### Don't:

- **Don't** restore green as the brand theme; reserve green for success states.
- **Don't** invent partner logos, testimonials, provider verification, AI calls, or payment success.
- **Don't** remove quote scope, licence, expiry, included commission, or the user's exact-price approval step for visual simplicity.
- **Don't** propagate inherited decorative eyebrows or the smallest legacy metadata sizes as new design primitives.
- **Don't** add card hover lifts, hard offset shadows, or a thick decorative border to the Connect example brief.
