# Contributing a design system

1. **Scaffold:** `npm run new -- <slug> --base <material|bootstrap|fluent|indigo> --maintainer <github-user>`.
2. **Design** in `designs/<slug>/_index.scss`:
   - `palette()` per variant. Pass `$generator: 'legacy'` to keep the exact seed color at shade 500.
   - `$<slug>-typeface`, `$<slug>-type-scale`, `$<slug>-elevations`, `$<slug>-roundness`.
   - `$_themes`: MCP component names → theme-function arguments, passed to `design-schema()`. Ask the igniteui-theming
     MCP which tokens are primary: `npm run mcp -- get_component_design_tokens component=<name>`. Preview the derived
     result with `npm run mcp -- create_component_theme …`.
3. **Fill in** `manifest.json`. It's validated by `schema/manifest.schema.json`.
4. **Validate:** `npm run validate -- <slug>`. This checks the manifest, that the Sass compiles (unknown
   components or arguments are errors), palette contrast, and that the surface matches the variant.
5. **Review:**
   - `npm run build:site && npm run review -- <slug>`, then open `review/<slug>/index.html`. It puts every state of
     every component (WC + the Angular grid with its menus and dialogs) next to the base theme and lists contrast
     violations the base doesn't have.
   - Aim for zero.
6. **Build** with `npm run build`, which regenerates `.github/CODEOWNERS`. Commit and open a PR.

The Angular preview needs Node ≥ 22.22.3 (Angular CLI 22).

## Ownership

- You own `designs/<slug>/`. CODEOWNERS routes reviews of that folder to the maintainers in your manifest.
- PRs that touch only your folder need only your review plus green CI.
- If a design stops validating and nobody fixes it, it may be marked unmaintained and later removed.
- Infragistics doesn't provide support for community designs.

## Naming conventions (the build relies on them)

| Export | Example |
| --- | --- |
| `$<slug>-<variant>-palette` | `$neo-brutalism-light-palette` |
| `$<variant>-<slug>-schema` | `$light-neo-brutalism-schema` |
| `$<slug>-typeface`, `$<slug>-type-scale` | `$neo-brutalism-typeface` |
| `$<slug>-elevations` | map of levels 0..24 to box-shadow |
| `$<slug>-roundness` | `0`..`1`, or `null` to keep the base |
