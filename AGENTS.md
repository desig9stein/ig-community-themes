# Instructions for AI agents

You can create and submit a community design system for Ignite UI end to end. Follow these steps exactly.

## Tools

- The **`igniteui-theming` MCP server** is configured in `.mcp.json` (`npx -y igniteui-theming@30`). Useful tools:
  - `create_palette` and `get_color` to explore palettes;
  - `get_component_design_tokens` to read what a component's tokens mean.

  It generates Sass you can adapt, but the source of truth in this repo is `designs/<slug>/_index.scss`.
- `npm run tokens -- <component>[.<variant>] --base <base> --variant <light|dark>` lists the exact token keys and
  default values that `design-schema()` accepts. An unknown key is a build error.

## Steps

1. Pick a unique slug, a base (`material | bootstrap | fluent | indigo`) and the variants.
2. Run `npm run new -- <slug> --base <base> --maintainer <github-user-who-will-maintain-it>`.
3. Edit `designs/<slug>/_index.scss`:
   - Set palettes for each variant.
   - Typography: typeface string plus a type scale, usually from `igniteui-theming/sass/typography/presets`.
   - Elevations: a map of levels 0..24 to box-shadow values, or a preset.
   - Roundness: 0..1, or `null`.
   - Token overrides via `design-schema()`.
   - Prefer palette references such as `(color: ('gray', 900))` over hex so light and dark both work.
4. Edit `designs/<slug>/manifest.json` and set `"authorType": "ai"`.
5. Run `npm run validate -- <slug>`, then fix every error. The contrast rules are hard requirements.
6. Run `npm run build`, which regenerates `dist/` and `.github/CODEOWNERS`.
7. Commit `designs/<slug>/` and `.github/CODEOWNERS`, then open a PR using the template. Name the agent that authored it.

## Rules

- Only touch `designs/<slug>/` (plus the regenerated `.github/CODEOWNERS`).
- Don't modify `lib/`, `scripts/` or other designs in the same PR.
- `parts.css` may contain only `igc-<component>::part(<name>)` rules: no `@import`, no `url()`.
- Don't use a built-in name (`material`, `bootstrap`, `fluent`, `indigo`) as a slug.
