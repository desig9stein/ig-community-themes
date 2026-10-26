# IG Community Themes

Community-made **design systems** for Ignite UI for Angular, Web Components and Blazor.

> These design systems are created and maintained by their authors (people and AI agents), **not by Infragistics**.
> Each one is owned by the maintainers listed in its `manifest.json`.

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
| Component tokens | any token of any component in the base schema | `--ig-<component>-<token>` |

Every Ignite UI component reads `var(--ig-<component>-<token>, <default>)` at runtime, so the same design works in
Angular, Web Components and Blazor. Layout and DOM structure come from the base. See [Limits](#limits).

## Use a design

```bash
npm i igniteui-community-themes
```

**Angular** (`styles.scss`):

```scss
@use 'igniteui-angular/theming' as *;
@use 'igniteui-community-themes/brutalism' as ds;

@include core();
@include typography($font-family: ds.$brutalism-typeface, $type-scale: ds.$brutalism-type-scale);
@include theme(
  ds.$brutalism-light-palette,
  $schema: ds.$light-brutalism-schema,
  $elevations: ds.$brutalism-elevations,
  $roundness: ds.$brutalism-roundness
);
```

**Web Components:**

```html
<link rel="stylesheet" href="node_modules/igniteui-webcomponents/themes/light/material.css" />
<link rel="stylesheet" href="node_modules/igniteui-community-themes/dist/brutalism/light.css" />
<script type="module">
  import { configureTheme } from 'igniteui-webcomponents';
  configureTheme('material', 'light'); // the design's base + variant
</script>
```

**Blazor:** add the base theme `<link>` and then the copied `dist/<slug>/<variant>.css`.

The preview site shows exact snippets for every design.

## Make one

```bash
npm install
npm run new -- my-design --base material --maintainer my-github-user
npm run tokens -- button.contained --base material   # discover token names
npm run dev                                           # live preview at http://localhost:5173/preview.html
npm run validate -- my-design
```

Then open a pull request. See [CONTRIBUTING.md](CONTRIBUTING.md); AI agents should read [AGENTS.md](AGENTS.md).

## Repo layout

```
designs/<slug>/manifest.json   metadata, base, variants, maintainers
designs/<slug>/_index.scss     palettes, typography, elevations, roundness, schemas
designs/<slug>/parts.css       optional ::part() tweaks for Web Components
lib/_index.scss                design-schema() and design-tokens() helpers
scripts/                       build, validate, new, tokens
site/                          gallery + weather-dashboard preview (GitHub Pages)
```

## Limits

- A design changes **tokens**, not component structure. Spacing that isn't tokenized, DOM and layout come from the base.
- `parts.css` can reach Web Component internals with `igc-*::part(...)` selectors. It doesn't apply to Angular.
- A truly new structural theme would need an upstream hook in Ignite UI; that's intentionally out of scope.
