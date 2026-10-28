# Instructions for AI agents

You can create and submit a community design system for Ignite UI end to end. Follow these steps exactly.

## Tools

- **igniteui-theming MCP server.** `.mcp.json` registers it (`npx -y igniteui-theming@30`). Without a client, use
  `npm run mcp -- <tool> key=value…`, the same server over stdio. Use it for every component you touch:
  1. `get_component_design_tokens component=<name>` gives the primary tokens. Those derive every state.
  2. `create_component_theme platform=webcomponents designSystem=<base> variant=light component=<name> 'tokens={…}'`
     shows the full derived theme, so you can check hover, focus, active and disabled before committing.
  3. Port the same arguments into `designs/<slug>/_index.scss` under `$_themes`, keyed by the MCP component name.
- **`npm run review -- <slug>`** (after `npm run build:site`). This renders every component in every state, the WC
  dashboard and the Angular hierarchical grid (menus, dialogs, editing), in light and dark. It writes a contact sheet
  to `review/<slug>/` and runs a contrast audit against the base theme. **Read the `sheet-*.png` images** and fix
  what looks wrong before you open a PR.

## Steps

1. Pick a unique slug, a base (`material | bootstrap | fluent | indigo`) and the variants.
2. Run `npm run new -- <slug> --base <base> --maintainer <github-user-who-will-maintain-it>`.
3. Edit `designs/<slug>/_index.scss`:
   - Palettes for each variant. Use `$generator: 'legacy'` to keep seed colors exact at shade 500.
   - Typography: a typeface string plus a type scale, usually from `igniteui-theming/sass/typography/presets`.
   - Elevations: a map of levels 0..24 to box-shadow values.
   - Roundness: 0..1, or `null`.
   - `$_themes`: component name → theme-function arguments. Start with the primary tokens only.
   - Use palette references (`color(null, 'primary', 500)`). Make `$_themes` a function of the variant when light and
     dark need different values (see `designs/neo-brutalism`).
   - Don't set a foreground by hand when you set a background. Let the theme function derive it. Set one only
     when the review shows the derived color failing, and then check it in every state.
4. Edit `designs/<slug>/manifest.json` and set `"authorType": "ai"`.
5. Run `npm run validate -- <slug>`. Unknown components or arguments are errors. The palette contrast rules are hard requirements.
6. Run `npm run build:site && npm run review -- <slug>`. Iterate until there are **0 new contrast issues** and the
   sheets look right in every state.
7. Run `npm run build` (it regenerates `.github/CODEOWNERS`). Commit `designs/<slug>/` and `.github/CODEOWNERS`, then
   open a PR using the template. Name the agent that authored it and attach the review sheets.

## Rules

- Only touch `designs/<slug>/` (plus the regenerated `.github/CODEOWNERS`).
- Don't modify `lib/`, `scripts/`, `site/`, `apps/` or other designs in the same PR.
- Only exposed theme tokens. No custom CSS that reaches into component internals.
- Don't use a built-in name (`material`, `bootstrap`, `fluent`, `indigo`) as a slug.
