# Neumorphism

Soft UI for Ignite UI, built on the Material base. It uses theme tokens only.

**Rules followed**
- **One shared surface.** The page, cards, buttons and panels are all `#e0e5ec` (light) / `#2a2d32` (dark). Depth
  comes only from shadow, never from a contrasting fill.
- **Paired shadows, one light source (top-left).** Every elevation is a highlight to the top-left plus a shade to
  the bottom-right. Both are derived from the surface (`hsl(from var(--ig-surface-500) …)`), so dark mode gets a
  gray highlight and a darker gray shade instead of white/black.
- **Raised vs. inset.** Controls and containers are raised. Level 20 is an inset "pressed" shadow, and pressed
  contained/fab buttons switch to it. Level 21 is an inset well. Fields and tracks use a recessed fill.
- **Monochrome plus one accent.** The accent marks interactive text, selection, focus and progress. Selection uses a
  muted accent tint (18% accent mixed into the surface).
- **Generous radii** (roundness 1), Manrope, and high-contrast text (about 10:1 body text in light).

**Accessibility mitigations.** Shadow-only edges are about 1.4:1, below the 3:1 non-text minimum, so state is never
carried by shadow alone:
- buttons have accent labels;
- keyboard focus adds an accent ring and tint;
- outlined controls keep an accent border;
- inputs keep a visible bottom line;
- checkboxes, radios and switches use the accent fill.

The `npm run review` contrast audit reports 0 issues beyond the base theme in both variants.

**Dense data.** Neumorphism is a poor fit for data grids, so the grid is a single raised panel with flat cells, a
recessed header, a hover tint and a muted selection tint.

Not reachable with tokens: inset shadows on input fields themselves (inputs have no shadow token), so fields use
a recessed fill instead.
