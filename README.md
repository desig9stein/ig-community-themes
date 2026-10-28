# IG Community Themes

Community-made **design systems** for Ignite UI for Angular, Web Components and Blazor.

> These design systems are created and maintained by their authors (people and AI agents), **not by Infragistics**.
> Each one is owned by the maintainers listed in its `manifest.json`.

| Design | Base | Idea |
| --- | --- | --- |
| [Neo-Brutalism](designs/neo-brutalism/) | material | Ink outlines, zero-blur offset shadows, square corners, pink/lime accents, tiered for dense data UIs |
| [Nord](designs/nord/) | indigo | Calm arctic palette with soft corners |

## What is a community design system?

Ignite UI ships four design systems (Material, Bootstrap, Fluent, Indigo). Each is a **schema**: a Sass map of
design tokens for every component, defined in [`igniteui-theming`](https://github.com/IgniteUI/igniteui-theming).
A community design system **extends one of them as its base** and brings its own:

| Layer | What you control | Where it lands |
| --- | --- | --- |
| Palette | `palette()` seeds for light and dark | `--ig-primary-500`, `--ig-surface-500`, … |
| Typography | typeface and type scale | `--ig-font-family`, `--ig-h1-*`, … |
| Elevations | all 25 shadow levels | `--ig-elevation-0..24` |
| Roundness | one 0..1 factor for every radius | `--ig-radius-factor` |
| Component themes | any component's theme-function arguments | `--ig-<component>-<token>` |

Components are themed **through their igniteui-theming theme functions** (`contained-button-theme()`, `grid-theme()`, …),
exactly as the igniteui-theming MCP's `create_component_theme` does. You pass a few primary tokens and every state
(hover, focus, focus-visible, active, selected, disabled) and every text color is derived for contrast.

Only exposed theme tokens are used, so the same design works in Angular, Web Components and Blazor, and layout and
DOM structure come from the base. See [Limits](#limits).

## Use a design

```bash
npm i igniteui-community-themes
```

**Angular** (`styles.scss`):

```scss
@use 'igniteui-angular/theming' as *;
@use 'igniteui-community-themes/neo-brutalism' as ds;

@include core();
@include typography($font-family: ds.$neo-brutalism-typeface, $type-scale: ds.$neo-brutalism-type-scale);
@include theme(
  ds.$neo-brutalism-light-palette,
  $schema: ds.$light-neo-brutalism-schema,
  $elevations: ds.$neo-brutalism-elevations,
  $roundness: ds.$neo-brutalism-roundness
);
```

**Web Components:**

```html
<link rel="stylesheet" href="node_modules/igniteui-webcomponents/themes/light/material.css" />
<link rel="stylesheet" href="node_modules/igniteui-community-themes/dist/neo-brutalism/light.css" />
<script type="module">
  import { configureTheme } from 'igniteui-webcomponents';
  configureTheme('material', 'light'); // the design's base + variant
</script>
```

**Blazor:** add the base theme `<link>` and then the copied `dist/<slug>/<variant>.css`.

## Preview and review

```bash
npm install && npm --prefix apps/angular install
npm run build:site          # designs + WC site + Angular app → _site/
npx vite preview            # /, /preview.html, /states.html, /angular/
npm run review -- <slug>    # screenshots + contrast audit → review/<slug>/index.html
```

- **`/preview.html`**: Web Components weather dashboard.
- **`/states.html`**: every component in idle, hover, focus-visible, pressed, selected, disabled and invalid states.
- **`/angular/`**: Ignite UI for Angular hierarchical grid with every major feature on: toolbar (advanced filtering /
  query builder, pinning, hiding, export), Excel-style filtering, sorting, moving, resizing, pinning, row selection,
  row editing, action strip, summaries, paging, child grids. Below it there's a group-by grid with a filter row, a
  standalone query builder, a calendar and a gallery of controls. Themes are compiled through Angular's own
  `theme($palette, $schema)`.
- **`npm run review`** drives real interactions in Chromium (hover, keyboard focus, press, menus, dialogs, row
  editing), screenshots each state next to the plain base theme, and runs axe-core color-contrast on both.
  A contrast violation only counts when the base theme doesn't have it too. `--strict` fails on any.

The Angular grids and query builder are under the Infragistics commercial license (see the `igniteui-angular`
LICENSE); the preview runs them as a trial, which is why they show a watermark.

## Make one

See [CONTRIBUTING.md](CONTRIBUTING.md). AI agents should read [AGENTS.md](AGENTS.md).

```bash
npm run new -- my-design --base material --maintainer my-github-user
npm run mcp -- get_component_design_tokens component=tabs   # primary tokens for a component
npm run validate -- my-design
npm run build:site && npm run review -- my-design
```

## Repo layout

```
designs/<slug>/manifest.json   metadata, base, variants, maintainers
designs/<slug>/_index.scss     palettes, typography, elevations, roundness, component themes
lib/_index.scss                design-schema() (runs theme functions into a schema) and design-tokens()
scripts/                       build, validate, new, mcp, review, angular-themes
site/                          gallery, WC dashboard, states page (GitHub Pages)
apps/angular/                  Angular hierarchical grid preview
```

## Limits

- A design changes **theme tokens**, not component structure. Spacing that isn't tokenized, DOM and layout come from the base.
  Example: Neo-Brutalism's spec asks for 3px borders and translate-on-hover, but border widths and transforms
  aren't tokens, so it uses colors, hard shadows and shadow collapse instead.
- `--ig-radius-factor: 0` squares everything that uses it. In Angular that includes the radio button, which has
  no radius token of its own.
- A few derived colors come from the composed grid itself. For example, the summary area is 12% of the grid
  foreground mixed into its background.
