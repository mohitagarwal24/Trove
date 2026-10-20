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
    padding: "0"
---

# Design System: Trove

## Overview

**Creative North Star: "The Technical Atlas"**

Trove is a working research marketplace: an ink navigation rail establishes orientation, chalk surfaces hold the source inventory, cobalt marks selection and action, and amber gives the research question its own place. The result is compact, orderly, and specific to a tool for investigating data.

The approved replacement of the former green identity retains the application and local fonts. Prepared regulatory datasets appear as ordinary paid products; source scope, original attribution, upstream reuse rights, exact USD prices, and human approval remain legible. The system uses functional line icons and CSS geometry, with concise copy and progressive disclosure for detailed terms. Supply assumptions belong in the hackathon pitch, while the interface identifies the actual PayPal payment environment.

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
**Google sign-in only:** Google Sans Medium, self-hosted as a 4 KB text subset for the official “Continue with Google” label. The official full-color Google G is sourced unchanged from [Google's branding assets](https://developers.google.com/identity/branding-guidelines). The font's OFL licence is bundled in `public/fonts/GOOGLE-SANS-OFL.txt`. This is a provider-brand treatment, not a replacement for Trove's Manrope/Inter typography.

Manrope adds rounded, confident headings while Inter preserves the dense working rhythm of controls and metadata. Retaining Inter is intentional in this operate-mode implementation.

### Hierarchy

- **Display:** the frontmatter role governs the main Discover heading. It becomes (38px) at widths up to (1050px) and (36px) up to (760px). Compact route headings use (36px), then (34px), then (32px) at the same breakpoints.
- **Headline:** section headings start with the frontmatter role; catalogue and panel titles often use (15px). The amber composer's question uses (27px), weight (650), line height (1.3), and tracking (-0.03em); at widths between (761px) and (1250px), it uses (24px).
- **Title:** offer titles use the frontmatter role, become (16px) up to (1250px), and (18px) up to (760px).
- **Body:** the application base is the frontmatter body role. Page descriptions use a maximum width of (65ch) and line height (1.8). Offer descriptions use (11px) and line height (1.75), becoming (12px) on mobile.
- **Action:** the frontmatter action role governs standard buttons; small buttons use (12px).
- **Label:** the frontmatter label role governs visible form labels. Form values use body size with line height (1.6); helper copy uses (12px) and line height (1.65). Sidebar links use (12px), increasing to (13px) on mobile.
- **Financial values:** use tabular numerals on offer prices, metrics, budgets, quote totals, summary totals, and amount columns. Offer prices use (22px).

**The Stable Amount Rule.** Financial values retain tabular numerals and an explicit USD context; changes in value must not shift a comparison column's rhythm.

Inherited compact metadata and uppercase utility labels remain in secondary screens. Their smallest sizes and eyebrow treatment are not canonical primitives for new work.

## Layout

The fixed rail is (232px) wide, matched by the main shell's left margin. At widths up to (1250px), both become (208px). The rail uses (100dvh): its brand and account footer do not shrink, and the middle region has `min-height: 0` with vertical scrolling. The agent callout lives inside that scrollable region, so “Your agent. Better informed.” stays reachable on shorter laptops. At desktop heights up to (820px), rail padding and gaps compress; up to (700px), the callout icon hides and copy spacing tightens. Account controls remain outside the scroll region.

Above the mobile breakpoint, a labelled utility-bar toggle switches the expanded rail to a (76px) icon rail and matches the main shell margin to it. The preference is stored in browser storage. The compact rail hides the workspace switch, group labels, callout, and profile text while retaining route icons with accessible names and native titles. Its account avatar still opens the account menu.

The utility bar is (64px) tall. A (2px) cobalt progress line follows document scrolling; after (12px) of scroll the bar gains a restrained shadow without changing its position or height. Main content is centered with a maximum width of (1510px), desktop horizontal gutters of (38px), top padding of (32px), and bottom padding of (55px). Up to (1250px), horizontal gutters become (25px) and bottom padding (45px). Up to (760px), gutters become (20px) and the utility bar (61px); up to (460px), gutters become (16px).

Discover has a flexible inventory plus a (294px) composer column, separated by (26px). At (1600px) and above, the composer becomes (320px) with a (32px) gap. Up to (1250px), it becomes (260px) with a (20px) gap. Up to (1050px), the composer group moves below the inventory and uses a (1.5fr / 1fr) internal grid; up to (460px), that group becomes one column. Offers use two equal columns and a (16px) gap, collapsing to one column up to (460px). Category tabs scroll horizontally rather than wrap.

Workspace uses a (350px) composer beside flexible output, becoming (300px) up to (1250px) and one column up to (1050px). Connect has a maximum width of (1160px). A full-width compact token row precedes configuration and example-task columns (1.5fr / 0.9fr, with a 260px minimum on the latter) separated by (22px). These columns stack up to (1050px); token creation stacks below its heading up to (760px). Account uses a maximum width of (1000px), paired profile and Google panels, then full-width security and data panels. Password fields share two equal columns; account grids become one column up to (760px). Connect’s tool reference is collapsed until requested. Purchase details similarly collapse their summary aside at (1050px). Data tables preserve columns inside horizontally scrollable containers.

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

**The Flat Inventory Rule.** Keep inventory card geometry fixed on hover; use border, a restrained ambient shadow, and selection treatments to communicate interaction.

Motion uses feedback (140ms), arrival (220ms), and exit (110ms) durations. Arrivals use `cubic-bezier(0.16, 1, 0.3, 1)`; drawer exits use `cubic-bezier(0.4, 0, 1, 1)`. The comparison dock arrives from a (10px) offset with opacity, keeping its shadow constant. The selected checkmark draws and the category underline expands from (0.3) to full width over the arrival duration. Selection-count changes fade over the feedback duration; financial values and layout-driving properties remain immediate.

Existing button and offer colors, borders, and shadows retain (180ms) transitions; field and icon-button feedback uses (140ms), and navigation uses (160ms); pressed buttons move down (1px) over the exit duration. Primary-action and offer arrows move (3px) over the feedback duration, while research-suggestion arrows retain (180ms). The mobile drawer opens over the arrival duration and closes over the exit duration. Dialogs enter with opacity and scale (0.985 to 1) over the arrival duration; content exits with opacity and a (4px) downward translation over the exit duration, while the overlay fades in over the feedback duration and out over the exit duration. Account menus settle from (4px) with opacity over (160ms). Route content fades from opacity (0.6) to (1) over (240ms) without translation. Only source inventory and newly returned decision rows unfold on first intersection: opacity (0.86 to 1) and an (8px to 0) bottom clip over (360ms), using arrival easing. Their default render remains visible; focused rows skip the animation. The scroll hook cancels active Web Animations when reduced motion is requested and cleans up observers on route changes. Reduced-motion preferences disable animations, transitions, smooth scrolling, and decorative press/hover transforms; selection marks, state colors, live status, and focus behavior remain available immediately.

## Shapes

Use softly squared forms with thin rules. Tags have the smallest radius; standard controls, search, offers, panels, the dock, and dialogs use the distinct radius roles in frontmatter. Borders are generally (1px). A selected offer adds an inset (1px) cobalt stroke rather than a hard offset shadow. Provider identities are compact rounded monograms with distinct cobalt, blue, or sand tints. Their shapes identify offers without implying verification or an upstream partnership.

The Connect example brief uses a uniform (1px) border around its light inset. Do not turn it into a decorative thick quote rail. Circles belong to avatars and state dots. The workspace empty state uses a short heading and explanation; example prompts stay with the composer.

## Components

### Buttons

Clear, compact actions with an (8px) radius and standard minimum height of (44px). Primary buttons use cobalt and white, deepen on hover, and shift down on press. Secondary buttons use white with a pale cool stroke; hover uses a pale cobalt fill and stronger stroke. Small buttons have a (36px) minimum height. Disabled buttons reduce opacity to (0.48) and show a not-allowed cursor. Keyboard focus uses a (2px) outline in `#5378ff`, offset by (4px).

### Chips

Offer tags use a pale cool fill, thin border, small radius, and compact padding. They describe content rather than acting as filters. Category tabs are separate controls: the selected tab has cobalt text, a (2px) bottom rule, and a tinted count. Freshness has a visible pressed state and count. Preserve `aria-selected` or `aria-pressed` alongside these treatments.

### Cards / Containers

Offer cards pair a provider identity and selection control with title, scope copy, category tags, source freshness, record limit, and a divided scoped-batch price footer. Standard cards use frontmatter padding and a minimum height of (285px) across the current cascade. At widths up to (1250px), padding becomes (18px 17px 0); up to (760px), it becomes (21px 20px 0). Selected cards use tinted paper plus cobalt border and inset stroke. Generic panels use the panel radius and padding roles, with (19px) padding up to (1250px). Purchase and seller tables retain their data hierarchy and scroll container.

### Inputs / Fields

Search is a (46px) white field with an inline search icon and optional keyboard hint. Focus changes its border and adds the restrained shadow in Elevation. The slash shortcut focuses search; clear search has an accessible label. Normal forms use visible labels, cool inset fills, (1px) borders, (7–8px) radii, and a (44px) minimum field height. Hover strengthens the border; focus uses white fill and cobalt border. Shared password fields reserve (48px) inside the input for a labelled show/hide button with pressed state; helper text remains associated with the field. Research textareas resize vertically. Search must continue querying public offer metadata only; its visual affordance must not imply access to paid payloads.

### Navigation

The rail uses pale text on ink. Hover lightens the inset; the active route uses cobalt with white text and `aria-current="page"`. The callout uses a lighter ink panel, amber icon/link, and readable supporting text. Profile settings stay pinned at the rail foot; the account menu opens upward and remains available in the icon rail. Preserve the labelled collapse control, accessible icon names, drawer, and height behavior described in Layout.

### Research Composer

The amber composer is a functional question surface with a large Manrope prompt, warm inset textarea, concise approval reminder, cobalt submit action, and regulatory example prompts. Its heading leads directly without a decorative eyebrow. It opens the research workspace, where a budget and genuine Gemini planning produce a source-selection task and exact-price quote. When AI is unavailable, the workspace disables research and links to browsing and comparison. Suggestions remain controls with a subtle warm hover fill and a short arrow movement.

### Comparison Dock

Selecting sources reveals a fixed dark-ink dock with selection count, exact combined price, clear action, and amber review action. At desktop it aligns to the content area (left 270px, right 38px, bottom 23px), shifting to (233px / 25px) up to (1250px). Mobile uses (16px) side and bottom insets. The arrival motion makes selection visible; reduced motion removes it. It remains a review step before immutable quote approval.

### Dialogs and Operational States

Dialogs are centered white flex-column surfaces with (16px) corners and a maximum height of `calc(100dvh - 48px)`. The fixed heading uses (24px 26px 20px) padding; only the body scrolls, with (24px 26px 26px) padding and contained overscroll. Up to (760px), the maximum height becomes `calc(100dvh - 24px)`, heading padding becomes (20px 20px 16px), and body padding becomes (20px). Standard width is `min(480px, calc(100vw - 32px))`; wide dialogs use (710px) instead of (480px). Keep labelled dialog semantics, focus trapping, Escape dismissal, and explicit close controls. Restore focus to the actual opener when it remains connected and outside inert content; preserve focus in another open dialog during a handoff.

Loading, empty search, connection failure, expired quote, unavailable integration, and uncertain-payment states retain concise explanations and recovery controls. Payment approval uses PayPal; Sandbox is identified when that environment is active. Payment and fulfilment remain distinct in purchase status; seller earnings and payout status appear in the provider workspace. Voids remain distinct from refunds. Results expose purchased rows, provenance, download, receipt, and a genuine AI summary only when integration and source permissions allow it. Missing integrations fail closed. Quote scope, filtered rows, expiry, and exact total precede approval; source licences and access details use an expandable section rather than repeated explanatory blocks. Previously purchased sources appear as separate no-charge rows with links to the purchased data. A zero-total plan opens with “Already purchased” and direct data links; checkout totals, expiry, payment-environment copy, and checkout controls are omitted. Receipt references and integrity fingerprints use native disclosure controls. Data tables keep headers sticky inside a bounded scroll region; values over (160) characters show a (140)-character preview with a keyboard-operable “Full value” disclosure, preserving the complete value and JSON download. Expanded values scroll within (18rem) rather than expanding the whole page.

### Accounts and Provider Publishing

Private workspaces use a shared sign-in and registration dialog with visible field labels, inline errors, and password guidance only when needed. Email ownership verification stays in that dialog with one labelled six-digit field, a numeric keyboard hint, and one-time-code autofill. Delivery feedback follows the service response; failed verification keeps an inline error and returns focus to the field. Resend shows its cooldown, “Use another account” provides recovery, and pending verification resumes in the same browser session. Successful proof continues the requested action automatically. Profile changes, password changes, account export, and account closure live on Account; destructive closure uses a separate confirmation dialog. Password recovery uses its own focused form and reports real service availability. When Google authentication is configured, the shared dialog offers a secondary “Continue with Google” action above the email form. Account exposes explicit Google linking; accounts without a password use Google identity confirmation for closure. The Google action uses the official full-color G at (20px), unchanged aspect ratio, provider-specific type, a white fill, gray stroke, and quiet hover feedback. Other controls follow the existing button and form vocabulary.

Provider onboarding collects profile details and distribution-rights attestation. Pending providers can prepare datasets, with a short review notice explaining why offers are not yet discoverable. Dataset publishing uses the same form vocabulary for a real JSON upload, source and licence links, attribution, declared source date, price, and explicit rights and AI-processing choices. Published offer edits create new versions. Keep review, publishing, earnings, and payout states truthful and specific to their audience.

### Agent Connection

Connect presents a compact token-management row above the client-configuration and example-task panels, following the responsive layout described above. Tokens show scope and active, expired, or revoked status; a token secret is displayed once, with copy feedback. The configuration panel uses a visibly labelled client selector for Codex, Claude Code, and Claude Desktop. File name, configuration text, setup hint, documentation link, and copied content follow the selected client. Tool descriptions sit in an expandable reference. Browser approval remains required for agent-prepared purchases. These are customer workflows and use the same shell, forms, focus treatment, and error handling as the rest of the application.

## Do's and Don'ts

### Do:

- **Do** preserve ink navigation, cobalt actions, and the amber research surface across routes.
- **Do** keep the rail callout and account controls reachable at normal zoom and short laptop heights.
- **Do** use local Manrope headings, Inter body copy, and tabular financial values.
- **Do** pair state color with text, preserve visible keyboard focus, and honor reduced motion.
- **Do** keep exact-price approval, the actual payment environment, permissions, and source provenance visible where relevant.

### Don't:

- **Don't** restore green as the brand theme; reserve green for success states.
- **Don't** invent partner logos, testimonials, provider verification, AI calls, or payment success.
- **Don't** remove quote scope, licence, expiry, included commission, or the user's exact-price approval step for visual simplicity.
- **Don't** propagate inherited decorative eyebrows or the smallest legacy metadata sizes as new design primitives.
- **Don't** add card hover lifts, hard offset shadows, or a thick decorative border to the Connect example brief.
