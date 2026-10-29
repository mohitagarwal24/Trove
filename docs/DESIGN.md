---
name: Trove
description: A technical atlas with a cinematic public introduction and a precise research workspace.
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
  selected-surface: "#f1f4ff"
  success: "#23694d"
  success-surface: "#eaf5ee"
  error: "#9c4539"
  night: "#101626"
  porcelain: "#f3f4f8"
  landing-muted: "#aeb9d0"
typography:
  landing-display:
    fontFamily: "Manrope, Inter, Arial, sans-serif"
    fontSize: "clamp(48px, 5.7vw, 84px)"
    fontWeight: 550
    lineHeight: 1.1
    letterSpacing: "-0.04em"
  landing-body:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "16px"
    lineHeight: 1.8
  landing-action:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 650
  display:
    fontFamily: "Manrope, Inter, Arial, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Manrope, Inter, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 650
    letterSpacing: "-0.4px"
  title:
    fontFamily: "Manrope, Inter, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 650
    lineHeight: 1.45
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "13px"
  action:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 550
    lineHeight: 1.35
  label:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 550
    lineHeight: 1.5
  identifier:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
  google-sign-in:
    fontFamily: "Google Sans, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.35
rounded:
  tag: "4px"
  control: "8px"
  field: "7px"
  search: "9px"
  dock: "12px"
  offer: "12px"
  panel: "14px"
  dialog: "16px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  panel: "23px"
  section: "26px"
  page-top: "36px"
  desktop-gutter: "38px"
components:
  landing-action:
    backgroundColor: "{colors.highlight}"
    textColor: "{colors.night}"
    typography: "{typography.landing-action}"
    rounded: "{rounded.control}"
    padding: "13px 20px"
    height: "48px"
  landing-action-hover:
    backgroundColor: "#ffe5a7"
  source-fragment:
    backgroundColor: "#182239"
    textColor: "#e4eafb"
    rounded: "{rounded.dock}"
    padding: "18px"
    width: "265px"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.accent-dark}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "#34415f"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
    height: "44px"
  form-field:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "11px 12px"
    height: "44px"
  google-sign-in:
    backgroundColor: "{colors.surface}"
    textColor: "#1f1f1f"
    typography: "{typography.google-sign-in}"
    rounded: "{rounded.control}"
    padding: "11px 12px"
    height: "44px"
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
    padding: "22px 22px 0"
  offer-card-selected:
    backgroundColor: "{colors.selected-surface}"
  research-start:
    textColor: "{colors.ink}"
    padding: "19px 4px"
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
    padding: "0"
---

# Design System: Trove

## Overview

**Creative North Star: "The Technical Atlas"**

Trove is a working research marketplace: an ink navigation rail establishes orientation, chalk surfaces hold the source inventory, cobalt marks selection and action, and amber marks navigation highlights and public entry actions. The result is compact, orderly, and specific to a tool for investigating data.

The approved replacement of the former green identity retains the application and local fonts. Prepared regulatory datasets appear as ordinary paid products; source scope, original attribution, upstream reuse rights, exact USD prices, and human approval remain legible. The system uses functional line icons and geometry, with concise copy and progressive disclosure for detailed terms. Supply assumptions belong in the hackathon pitch, while the interface identifies the actual PayPal payment environment.

The approved Data Convergence public introduction expands this world into deep ink, porcelain, and amber, with larger, lighter Manrope type and real Three.js particle geometry. Its spacious Persuade mode leads into the established Operate mode for authentication and research. This is an extension of the Technical Atlas: the working application retains its navigation, compact density, and exact-price controls. The scene adds no raster asset or invented partner identity.

**Key Characteristics:**

- Persistent ink navigation with reachable account and agent controls.
- Cobalt actions and selection against quiet white inventory panels.
- Editable research starting points shared across dashboard, catalogue, and workspace.
- Manrope headings, Inter controls, and tabular financial values.
- Flat information surfaces with depth reserved for controls and overlays.
- A spacious deep-ink introduction with amber entry actions and source fragments that gather into context.

The normative values above describe the current cascades in `src/app/globals.css` and `src/app/landing.css`. This document is the system record; the surface briefs in `.impeccable/surfaces/src-components-discover-tsx.md`, `.impeccable/surfaces/src-components-landing-tsx.md`, and `.impeccable/surfaces/src-components-workspace-tsx.md` own their respective compositions. Page-specific story order and routes remain surface and product decisions.

## Colors

Cool ink and cobalt organize the working interface; amber identifies navigation highlights, sandbox context, and entry actions on the deep-ink public introduction.

### Primary

- **Atlas Cobalt** (`accent`): purchase and research actions, active filters, checked selections, links, and the second phrase of page headings. **Deep Cobalt** (`accent-dark`) is its primary-button hover state.

### Secondary

- **Amber Marker** (`highlight`): the brand period on the ink rail, agent connection link, and primary action inside the dark comparison dock.
- On deep-ink public surfaces, **Amber Marker** also carries headline emphasis, entry actions, and the connected-context bundle. The pale closing section returns to cobalt actions and emphasis.

### Neutral

- **Chalk Canvas** (`canvas`) and **White Surface** (`surface`): the application background and working panels.
- **Navigation Ink** (`sidebar`): the persistent rail; its inset controls use lighter ink tones and pale text.
- **Reading Ink** (`ink`): primary content. **Slate Text** (`muted`) and **Secondary Slate** (`faint`) support contextual copy.
- **Cool Rule** (`line`): panel edges and structural dividers. **Selected Paper** (`selected-surface`) pairs with a cobalt border and inset stroke for selected offers.
- **Deep Ink** (`night`) and **Porcelain** (`porcelain`): the public introduction and the sign-in story panel. These extend rather than replace the working rail and reading-ink roles. **Story Slate** (`landing-muted`) supports public navigation, skip links, and footer copy.

Success green belongs to confirmed status badges and success notices. Error red belongs to error copy and error states. Neither is a brand accent. Every state also carries text or an icon with an accessible name.

**The Action Cobalt Rule.** In the working application, use cobalt to express an action, selection, or the established heading emphasis; preserve amber for its navigation-highlight, agent-panel icon, and sandbox roles. Deep-ink public surfaces use amber entry actions and headline emphasis; pale public surfaces return to cobalt.

## Typography

**Display Font:** locally hosted Manrope, falling back to Inter and Arial.
**Body Font:** locally hosted Inter, falling back to Arial.
**Identifier Font:** the system monospace stack for hashes, tokens, configuration, and keyboard hints.
**Google sign-in only:** Google Sans Medium, self-hosted as a 4 KB text subset for the official “Continue with Google” label. The official full-color Google G is sourced unchanged from [Google's branding assets](https://developers.google.com/identity/branding-guidelines). The font's OFL licence is bundled in `public/fonts/GOOGLE-SANS-OFL.txt`. This is a provider-brand treatment, not a replacement for Trove's Manrope/Inter typography.

Manrope adds rounded, confident headings while Inter preserves the dense working rhythm of controls and metadata. Retaining Inter is intentional in the working application and its public extension; no new font family is introduced by Data Convergence.

### Hierarchy

- **Public display:** the landing-display role uses a lighter Manrope weight and balanced wrapping. It becomes (57px) up to (1100px), then `clamp(39px, 8.9vw, 58px)` up to (760px). Desktop heights up to (700px) use (64px). Supporting story copy uses the landing-body role, a (370px) maximum width, and becomes (13px) with a (330px) maximum on mobile. The pale closing headline uses `clamp(40px, 4.6vw, 68px)`, then (44px) on mobile. Sign-in uses a (31px) heading, becoming (29px) on mobile.
- **Display:** the frontmatter role sets the working-page baseline. Existing compact route overrides still use (36px) on desktop and (34px) up to (1050px), while the older standard-page override makes Discover (38px) between (761px) and (1050px). The final shared mobile override is (28px). This tablet increase is inherited cascade drift, not a scale to extend to new surfaces.
- **Headline:** section headings start with the frontmatter role; catalogue and panel titles often use (15px). The white catalogue guide uses (20px) Manrope at line height (1.35). Research-start titles use (14px) Inter at weight (550), with (12px) supporting text, locally (11px) inside the narrower catalogue guide.
- **Title:** offer titles use the frontmatter role, become (16px) up to (1250px), and (18px) up to (760px).
- **Body:** the application base is the frontmatter body role. Page descriptions use a maximum width of (65ch) and line height (1.8). Offer descriptions use (13px) and line height (1.75), becoming (12px) on mobile. Search values and placeholders use (13px); provider names use (12px) on desktop and (11px) on mobile.
- **Action:** the frontmatter action role governs standard buttons; small buttons use (12px).
- **Label:** the frontmatter label role governs visible form labels. Form values use body size with line height (1.6); helper copy uses (12px) and line height (1.65). Sidebar links use (13px).
- **Financial values:** use tabular numerals on offer prices, metrics, budgets, quote totals, summary totals, and amount columns. Offer prices use (22px).

**The Stable Amount Rule.** Financial values retain tabular numerals and an explicit USD context; changes in value must not shift a comparison column's rhythm.

Inherited compact metadata and uppercase utility labels remain in secondary screens. Their smallest sizes and eyebrow treatment are not canonical primitives for new work. The landing's compact field preview, including its (8px) mobile override, is a local detail rather than a reusable body or label role.

## Layout

Public surfaces run outside the application rail. The landing's fixed header is (96px) high with (5.5vw) horizontal gutters; on mobile it becomes (76px) with (22px) gutters. Native scrolling passes four viewport-height chapters alongside a sticky `100svh` scene, with a (600px) desktop minimum and (650px) mobile minimum. The text column occupies (52%) with a (740px) maximum; mobile makes it full width and moves source fragments below the copy. The scene stays inside its story so the pale closing section remains clear. Available catalogue metadata adds a white source-preview section between the story and closing section, with a three-column divided inventory that stacks up to (760px). Source titles and arrows lead directly into descriptions, fields, bounded record counts, and tabular USD prices. The closing section uses a two-column grid with (112px 7vw) padding; up to (760px), it becomes one column with (70px 25px) padding. Reduced motion and graphics failure put all chapters into normal flow, followed by the source disclosures, while the fixed header and skip links stay reachable.

Dedicated sign-in uses a (44% / 56%) story/form split, with the form centered at a (400px) maximum width. Up to (760px), the story contracts to a brand strip and the form uses (24px) page gutters and a (420px) maximum. The dashboard reuses the working shell and a (1200px) content maximum. A white research-start panel and deep-ink agent panel share (1.65fr / 1fr) columns, a (270px) minimum agent width, and a (24px) gap; they stack up to (1050px). Two equal recent-research/data columns follow with a (30px) gap and stack up to (760px). Its mobile heading and primary action stack. The mobile agent callout uses a (24px) icon column beside flexible text, with the action below the text. Empty states occupy the same sections as genuine account data.

The fixed rail is (232px) wide, matched by the main shell's left margin. At widths up to (1250px), both become (208px). The rail uses (100dvh): its brand and account footer do not shrink, and the middle region has `min-height: 0` with vertical scrolling. The agent callout lives inside that scrollable region, so “Your agent. Better informed.” stays reachable on shorter laptops. At desktop heights up to (820px), rail padding and gaps compress; up to (700px), the callout icon hides and copy spacing tightens. Account controls remain outside the scroll region.

Above the mobile breakpoint, a labelled utility-bar toggle switches the expanded rail to a (76px) icon rail and matches the main shell margin to it. The preference is stored in browser storage. The compact rail hides the workspace switch, group labels, callout, and profile text while retaining route icons with accessible names and native titles. Its account avatar still opens the account menu.

The utility bar is (64px) tall. After (12px) of scroll the bar gains a restrained shadow without changing its position or height. Main content is centered with a maximum width of (1510px), desktop horizontal gutters of (38px), top padding of (36px), and bottom padding of (55px). Up to (1250px), horizontal gutters become (25px) and bottom padding (45px). Up to (760px), gutters become (20px) and the utility bar (61px); up to (460px), gutters become (16px).

Discover has a flexible inventory plus a (294px) guide column, separated by (26px). At (1600px) and above, the guide becomes (320px) with a (32px) gap. Up to (1250px), it becomes (260px) with a (20px) gap. Up to (1050px), the guide moves below the inventory and its three research starts form equal columns with a (20px) gap; up to (760px), the starts return to divided rows. Offers use two equal columns and a (16px) gap, collapsing to one column up to (460px). Category tabs scroll horizontally rather than wrap.

Workspace uses a (350px) composer beside flexible output, becoming (300px) up to (1250px) and one column up to (1050px). Connect has a maximum width of (1160px). Account-based client setup and connected-app management occupy adjacent columns (1.5fr / 0.9fr, with a 260px minimum on the latter) separated by (22px). Advanced access tokens use a full-width native disclosure below these panels; the example task and collapsed tool reference follow. The columns stack up to (1050px), and connected-app rows wrap on narrow screens. Standalone connection consent sits outside the rail, with a home link above a panel in a centered (540px) maximum-width column. Long app names and callback hosts wrap; consent actions can wrap on narrow screens. Account uses a maximum width of (1000px), paired profile and Google panels, then full-width security and data panels. Password fields share two equal columns; account grids become one column up to (760px). Connect’s tool reference is collapsed until requested. Purchase details similarly collapse their summary aside at (1050px). Data tables preserve columns inside horizontally scrollable containers.

Up to (760px), the rail becomes a full-content drawer of `min(288px, 86vw)`, regardless of the stored desktop rail preference; the desktop collapse toggle is hidden. It opens above a backdrop, makes the main shell inert, locks body scrolling, traps keyboard focus, closes on Escape, and restores focus. Closed mobile navigation is inert. Retain its labelled dialog and modal semantics when open. A skip link precedes the shell.

**The Reachable Rail Rule.** Preserve the scrollable middle and pinned account footer; never make navigation depend on a tall viewport or reduced browser zoom.

## Elevation & Depth

White panels and offer cards rest on borders and tonal separation. Fine-pointer hover changes an offer's border and adds a restrained ambient shadow without moving the card. Selected offers add a cobalt inset stroke. Primary buttons have a small ambient shadow; menus, the comparison dock, and dialogs carry the deeper shadows that explain their position above working content.

### Shadow Vocabulary

- **Primary control:** `0 3px 7px #233f9915`; hover uses `0 4px 12px #233f9925`.
- **Search focus:** `0 3px 12px #3155d919`, paired with the focused border.
- **Account menu:** `0 12px 35px #10182d26`.
- **Comparison dock:** `0 12px 32px #18233a30`.
- **Dialog:** `0 28px 100px #0b122230`; its scrim uses blur (5px).
- **Offer hover:** `0 7px 20px #1c32670a`, for pointers that support hover.
- **Scrolled utility bar:** `0 5px 18px #1822400a`, without changing bar geometry.
- **Google sign-in hover:** `0 2px 6px #20212412`, within the provider-brand action.
- **Public entry hover:** `0 6px 20px #050a1a42`, over deep ink.
- **Source fragment:** `0 18px 40px #02081830`, separating the interactive document surfaces from the particle field.

**The Flat Inventory Rule.** Keep inventory card geometry fixed on hover; use border, a restrained ambient shadow, and selection treatments to communicate interaction.

Motion uses feedback (140ms), arrival (220ms), and exit (110ms) durations. Arrivals use `cubic-bezier(0.16, 1, 0.3, 1)`; drawer exits use `cubic-bezier(0.4, 0, 1, 1)`. The comparison dock arrives from a (10px) offset with opacity, keeping its shadow constant. The selected checkmark draws and the category underline expands from (0.3) to full width over the arrival duration. Selection-count changes fade over the feedback duration; financial values and layout-driving properties remain immediate.

Existing button and offer colors, borders, and shadows retain (180ms) transitions; field and icon-button feedback uses (140ms), and navigation uses (160ms); pressed buttons move down (1px) over the exit duration. Primary-action and offer arrows move (3px) over the feedback duration, while research-start rows change fill and text color over (160ms). The mobile drawer opens over the arrival duration and closes over the exit duration. Dialogs enter with opacity and scale (0.985 to 1) over the arrival duration; content exits with opacity and a (4px) downward translation over the exit duration, while the overlay fades in over the feedback duration and out over the exit duration. Account menus settle from (4px) with opacity over (160ms). Route content fades from opacity (0.6) to (1) over (240ms) without translation. Only source inventory and newly returned decision rows unfold on first intersection: opacity (0.86 to 1) and an (8px to 0) bottom clip over (360ms), using arrival easing. Their default render remains visible; focused rows skip the animation. The scroll hook cancels active Web Animations when reduced motion is requested and cleans up observers on route changes. Reduced-motion preferences disable animations, transitions, smooth scrolling, and decorative press/hover transforms; selection marks, state colors, live status, and focus behavior remain available immediately.

The public scene is progressively enhanced: accessible copy appears before Three.js is imported. Native scroll progress drives particles from scattered points toward layered document frames; subtle pointer rotation stays decorative. Render work is throttled by a (32ms) frame interval, with (2200) desktop particles and (700) mobile particles, and device-pixel-ratio caps of (1.5 / 1.25). Offscreen and hidden-document rendering pauses; geometry, materials, observers, and listeners are disposed on cleanup. Reduced motion skips the geometry import, and graphics failure or context loss selects the normal-flow story. Entry arrows move (2px, -2px) over (180ms); the context bundle fades and settles from (14px) over (240ms). None of this motion signals a real purchase or research completion.

**The Readable Story Rule.** Keep every story chapter, source disclosure, entry action, and skip route usable when animated geometry is unavailable or motion is reduced.

## Shapes

Use softly squared forms with thin rules. Tags have the smallest radius; standard controls, search, offers, panels, the dock, and dialogs use the distinct radius roles in frontmatter. Borders are generally (1px). A selected offer adds an inset (1px) cobalt stroke rather than a hard offset shadow. Provider identities are compact rounded monograms with distinct cobalt, blue, or sand tints. Their shapes identify offers without implying verification or an upstream partnership.

The Connect example brief uses a uniform (1px) border around its light inset. Do not turn it into a decorative thick quote rail. Circles belong to avatars and state dots. The workspace empty state uses a short heading and explanation; example prompts stay with the composer.

Public source fragments and the context bundle reuse the softly squared (12px) form. Fragment rotations and layered line frames belong to the cinematic story; working inventory cards keep their fixed geometry. The existing (8px) control radius also governs public entry links. The landing's geometry is native Three.js points and lines, with CSS guide lines and document surfaces; it does not introduce a raster illustration library.

## Components

### Buttons

Clear, compact actions with an (8px) radius and standard minimum height of (44px). Primary buttons use cobalt and white, deepen on hover, and shift down on press. Secondary buttons use white with a pale cool stroke; hover uses a pale cobalt fill and stronger stroke. Small buttons have a (36px) minimum height. Disabled buttons reduce opacity to (0.48) and show a not-allowed cursor. Keyboard focus uses a (2px) outline in `#5378ff`, offset by (4px).

Public entry links use the landing-action role: amber on deep ink, pale amber hover, and an inline northeast arrow. Their (48px) desktop minimum becomes (43px) in mobile story copy and (40px) in the compact mobile header. The pale closing section uses cobalt and white. Public links and native disclosure summaries use an amber (2px) focus outline with a (6px) offset, maintaining contrast on the dark field.

### Chips

Offer tags use a pale cool fill, thin border, small radius, and compact padding. They describe content rather than acting as filters. Category tabs are separate controls: the selected tab has cobalt text, a (2px) bottom rule, and a tinted count. Freshness has a visible pressed state and count. Preserve `aria-selected` or `aria-pressed` alongside these treatments.

### Cards / Containers

Offer cards pair a provider identity and selection control with title, scope copy, category tags, source freshness, record limit, and a divided scoped-batch price footer. Standard cards use frontmatter padding and a minimum height of (290px) across the current cascade. At widths up to (1250px), padding becomes (18px 17px 0); up to (760px), it becomes (21px 20px 0). Selected cards use tinted paper plus cobalt border and inset stroke. Generic panels use the panel radius and padding roles, with (19px) padding up to (1250px). Purchase and seller tables retain their data hierarchy and scroll container. Shared table scroll containers establish a relative positioning context so absolute accessibility labels remain contained on narrow screens.

### Inputs / Fields

Search is a (46px) white field with an inline search icon and optional keyboard hint. Focus changes its border and adds the restrained shadow in Elevation. The slash shortcut focuses search; clear search has an accessible label. Normal forms use visible labels, cool inset fills, (1px) borders, (7–8px) radii, and a (44px) minimum field height. Hover strengthens the border; focus uses white fill and cobalt border. Shared password fields reserve (48px) inside the input for a labelled show/hide button with pressed state; helper text remains associated with the field. Research textareas resize vertically. Search must continue querying public offer metadata only; its visual affordance must not imply access to paid payloads.

### Navigation

The rail uses pale text on ink. Hover lightens the inset; the active route uses cobalt with white text and `aria-current="page"`. The callout uses a lighter ink panel, amber icon/link, and readable supporting text. Profile settings stay pinned at the rail foot; the account menu opens upward and remains available in the icon rail. Preserve the labelled collapse control, accessible icon names, drawer, and height behavior described in Layout.

The public header stays above the story with the Trove home link, catalogue link, chapter anchor, sign-in/dashboard link, and entry action. The catalogue link and chapter anchor hide on mobile while entry and account navigation remain available. A keyboard skip link precedes the header and a visible skip link appears in the opening chapter. The footer offers privacy, terms, and the catalogue; the application shell retains its existing navigation and adds an Overview destination for the dashboard.

### Source Fragments

Native `details` surfaces let a visitor inspect a domain without depending on the canvas. The medical/regulatory fragment exposes current public offer metadata, a catalogue link, and original attribution when available. A fine-pointer hover or keyboard focus previews its attribution; opening it reveals the complete source explanation. Legal and financial fragments state that they are future domains. A stronger border and raised stacking order keep open disclosures readable. The decorative connected-context bundle is hidden from assistive technology; written chapter copy carries the meaning.

### Dashboard

The dashboard leads with three editable research starts and a persistent deep-ink agent panel. The panel uses an amber connection icon, pale copy, and a white secondary action; actual connection state changes its copy and action between setup and management. Recent research uses actual task prompts and dates; purchased data lists only captured, available, unrevoked access. Pending payment states appear in a separate attention section. Quiet, left-aligned empty sections offer a next step, and errors offer recovery. Task and purchase rows preserve the shared line, type, and icon vocabulary without invented activity or metrics.

### Research Starts and Composer

Dashboard, catalogue, and workspace reuse divided rows with a functional line icon, explicit category title, short field description, and arrow. These link to or select editable requirements; they never submit a task. The catalogue places them in a white guide with a separate preview-and-approval reminder. The workspace owns the actual composer, using the standard white panel beside a left-aligned welcome region. Choosing a start focuses that composer and selects “Choose requirements”; the optional “Describe a brief” mode remains available.

Requirements use labelled category choices, record count, snapshot age, and intended use; per-category native disclosures reveal required fields and filters. These explicit requirements produce real source matches and an exact-price quote without a model call or prefunded balance. Genuine Gemini planning remains available for briefs when configured; brief failures expose a “Choose requirements” recovery action. Task and account spending caps are labelled as limits rather than wallet balances, with USD prices and PayPal approval remaining visible.

### Comparison Dock

Selecting sources reveals a fixed dark-ink dock with selection count, exact combined price, clear action, and amber review action. At desktop it aligns to the content area (left 270px, right 38px, bottom 23px), shifting to (233px / 25px) up to (1250px). Mobile uses (16px) side and bottom insets. The arrival motion makes selection visible; reduced motion removes it. It remains a review step before immutable quote approval.

### Dialogs and Operational States

Dialogs are centered white flex-column surfaces with (16px) corners and a maximum height of `calc(100dvh - 48px)`. The fixed heading uses (24px 26px 20px) padding; only the body scrolls, with (24px 26px 26px) padding and contained overscroll. Up to (760px), the maximum height becomes `calc(100dvh - 24px)`, heading padding becomes (20px 20px 16px), and body padding becomes (20px). Standard width is `min(480px, calc(100vw - 32px))`; wide dialogs use (710px) instead of (480px). Keep labelled dialog semantics, focus trapping, Escape dismissal, and explicit close controls. Restore focus to the actual opener when it remains connected and outside inert content; preserve focus in another open dialog during a handoff.

Loading, empty search, connection failure, expired quote, unavailable integration, and uncertain-payment states retain concise explanations and recovery controls. Payment approval uses PayPal; Sandbox is identified when that environment is active. Purchase details expose independent Payment and Delivery badges in a native definition list beneath the heading, with polite live updates. The list wraps with (10px 24px) gaps, (8px) label-to-badge spacing, and (12px) muted labels; it replaces the five-step purchase-progress panel. Seller earnings and payout status appear in the provider workspace. Voids remain distinct from refunds. Results expose purchased rows, provenance, download, receipt, and a genuine AI summary only when integration and source permissions allow it. Missing integrations fail closed. Quote scope, filtered rows, expiry, and exact total precede approval; source licences and access details use an expandable section rather than repeated explanatory blocks. Previously purchased sources appear as separate no-charge rows with links to the purchased data. A zero-total plan opens with “Already purchased” and direct data links; checkout totals, expiry, payment-environment copy, and checkout controls are omitted. Receipt references and integrity fingerprints use native disclosure controls. Data tables keep headers sticky inside a bounded scroll region; values over (160) characters show a (140)-character preview with a keyboard-operable “Full value” disclosure, preserving the complete value and JSON download. Expanded values scroll within (18rem) rather than expanding the whole page.

### Accounts and Provider Publishing

The dedicated sign-in page and protected-action dialog use the same authentication component, with visible field labels, inline errors, and password guidance only when needed. Email ownership verification stays in that active surface with one labelled six-digit field, a numeric keyboard hint, and one-time-code autofill. Delivery feedback follows the service response; failed verification keeps an inline error and returns focus to the field. Resend shows its cooldown, “Use another account” provides recovery, and pending verification resumes in the same browser session. Successful proof continues the requested action automatically. Profile changes, password changes, account export, and account closure live on Account; destructive closure uses a separate confirmation dialog. Password recovery uses its own focused form and reports real service availability. When Google authentication is configured, both authentication surfaces offer a secondary “Continue with Google” action above the email form. Account exposes explicit Google linking; accounts without a password use Google identity confirmation for closure. The Google action uses the official full-color G at (20px), unchanged aspect ratio, provider-specific type, a white fill, gray stroke, and quiet hover feedback. Other controls follow the existing button and form vocabulary.

Provider onboarding collects profile details and distribution-rights attestation. Pending providers can prepare datasets, with a short review notice explaining why offers are not yet discoverable. Dataset publishing uses the same form vocabulary for a real JSON upload, source and licence links, attribution, declared source date, price, and explicit rights and AI-processing choices. Published offer edits create new versions. Keep review, publishing, earnings, and payout states truthful and specific to their audience.

### Agent Connection

Connect leads with Trove-account OAuth setup, following the responsive layout described above. A visibly labelled client selector offers ChatGPT, Claude, Codex, and Claude Code. The MCP server URL or terminal commands, setup hint, guide link, and copied content follow the selected client. Connected apps display real client names, scopes, connected/expired/disconnected states, and an explicit Disconnect action. Manual tokens remain in an “Advanced access tokens” disclosure; their scopes, active/expired/revoked states, one-time secret display, and copy feedback remain available. The example task preserves its approval reminder, and tool descriptions remain in an expandable reference.

Standalone consent identifies the signed-in account, requested permissions, client-provided app name, and callback host. Cancel and Allow connection share the established button vocabulary. A visible boundary explains that the connection cannot approve or capture payments; each purchase still requires the user’s browser approval. Invalid consent shows a recovery link to connections. These surfaces reuse the existing panels, cobalt state icons, labelled controls, focus treatment, and error notices. The `--muted` CSS variable resolves the existing Slate Text token; this extension adds no color, font family, or raster asset.

## Do's and Don'ts

### Do:

- **Do** preserve ink navigation, cobalt actions, and amber navigation and public-entry highlights across routes.
- **Do** keep the rail callout and account controls reachable at normal zoom and short laptop heights.
- **Do** use local Manrope headings, Inter body copy, and tabular financial values.
- **Do** pair state color with text, preserve visible keyboard focus, and honor reduced motion.
- **Do** keep exact-price approval, the actual payment environment, permissions, and source provenance visible where relevant.
- **Do** keep the public story readable in normal flow when motion is reduced or graphics are unavailable.
- **Do** label future domains explicitly and keep available-source details tied to actual catalogue metadata.

### Don't:

- **Don't** restore green as the brand theme; reserve green for success states.
- **Don't** invent partner logos, testimonials, provider verification, AI calls, or payment success.
- **Don't** remove quote scope, licence, expiry, included commission, or the user's exact-price approval step for visual simplicity.
- **Don't** propagate inherited decorative eyebrows or the smallest legacy metadata sizes as new design primitives.
- **Don't** add card hover lifts, hard offset shadows, or a thick decorative border to the Connect example brief.
