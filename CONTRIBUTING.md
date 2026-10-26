# Contributing a design system

1. **Scaffold:** `npm run new -- <slug> --base <material|bootstrap|fluent|indigo> --maintainer <github-user>`.
2. **Design** in `designs/<slug>/_index.scss`:
   - `palette()` per variant. Pass `$generator: 'legacy'` if you need the exact seed color at shade 500.
   - `$<slug>-typeface`, `$<slug>-type-scale`, `$<slug>-elevations`, `$<slug>-roundness`.
   - Token overrides via `design-schema($base-schema, '<slug>', $overrides)`. Reference palette colors as
     `(color: ('primary', 500))` or `(contrast-color: ('primary', 500))` so one map works for light and dark.
     Use `map.deep-merge` to add variant-only tweaks (see `designs/brutalism`).
   - Find components and tokens with `npm run tokens -- [component[.variant]] --base <base> --variant <light|dark>`.
3. **Fill in** `manifest.json` (validated by `schema/manifest.schema.json`).
4. **Preview:** `npm run dev`, then open `/preview.html?design=<slug>`. Use "Show base only" to compare.
5. **Validate:** `npm run validate -- <slug>`. It checks:
   - the manifest;
   - that the Sass compiles (unknown components or tokens are errors);
   - contrast: gray 900 on surface ≥ 4.5 and primary 500 on surface ≥ 3;
   - that the surface matches the variant;
   - `parts.css` safety.
6. **Build** with `npm run build`, which regenerates `.github/CODEOWNERS`. Commit everything and open a PR.

## Ownership

- You own `designs/<slug>/`. CODEOWNERS routes reviews of that folder to the maintainers in your manifest.
- PRs that touch only your folder need only your review plus green CI.
- If a design stops validating and nobody fixes it, it may be marked unmaintained and later removed.
- Infragistics doesn't provide support for community designs.

## Naming conventions (the build relies on them)

| Export | Example |
| --- | --- |
| `$<slug>-<variant>-palette` | `$brutalism-light-palette` |
| `$<variant>-<slug>-schema` | `$light-brutalism-schema` |
| `$<slug>-typeface`, `$<slug>-type-scale` | `$brutalism-typeface` |
| `$<slug>-elevations` | map of levels 0..24 to box-shadow |
| `$<slug>-roundness` | `0`..`1`, or `null` to keep the base |
