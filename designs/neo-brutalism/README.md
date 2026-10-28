# Neo-Brutalism

A tiered neo-brutalist design system for Ignite UI, built on the Material base. It uses theme tokens only.

| Role | Light | Dark |
| --- | --- | --- |
| Action (primary) | `#ff006e` pink, black text (5.5:1) | same |
| Selection / header blocks (secondary) | `#ccff00` lime | same |
| Info | `#00d9ff` cyan | same |
| Canvas / panels | `#f4f4f0` / near-white | `#121212` / charcoal |
| Structural ink | `#000` | `#f5f5f5` (black outlines vanish on dark) |

- **Macro framing:** cards, dialogs, calendar, grid shell and toolbars get ink outlines and 6–8px zero-blur offset
  shadows. Headers are flat accent blocks: a lime grid header, query builder and expansion panel; a pink calendar header.
- **Micro data:** grid cells, list rows and date nodes keep thin lines and neutral fills. Selection is a solid
  fill: a pink row, lime dates and list items.
- **Tactile buttons:** contained and fab buttons rest on a 4px shadow, lift to 6px on hover and collapse to 0
  when pressed. Keyboard focus-visible switches to a lime fill so it can't be confused with the ink border.
- **Text never sits on pink unless it's black.** White on `#ff006e` is only 3.8:1. Accent text and icons inside the grid
  (summaries, paging, toolbar) are ink.

Not reachable with tokens, so intentionally left out: 3px border widths, translate-on-hover, monospace grid headers.
