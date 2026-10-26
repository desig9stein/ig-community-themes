// Shared helpers: discover designs, check manifests, compile CSS.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as sass from 'sass';

export const BASES = ['material', 'bootstrap', 'fluent', 'indigo'];
export const VARIANTS = ['light', 'dark'];
export const DESIGNS_DIR = 'designs';

const SLUG = /^[a-z][a-z0-9-]{1,39}$/;
const GH_USER = /^[A-Za-z0-9-]{1,39}$/;

export function listDesigns() {
  return readdirSync(DESIGNS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name)
    .sort();
}

export function readManifest(slug) {
  return JSON.parse(readFileSync(join(DESIGNS_DIR, slug, 'manifest.json'), 'utf8'));
}

/** Returns a list of problems with a manifest (empty when valid). */
export function checkManifest(slug, m) {
  const errors = [];
  const req = (cond, msg) => cond || errors.push(msg);

  req(typeof m.name === 'string' && m.name.length > 0 && m.name.length <= 60, 'name: required, max 60 chars');
  req(m.slug === slug, `slug: must equal the folder name "${slug}"`);
  req(SLUG.test(slug), 'slug: lowercase letters, digits and dashes, 2-40 chars');
  req(!BASES.includes(slug), `slug: "${slug}" is reserved for a built-in design system`);
  req(typeof m.description === 'string' && m.description.length <= 200, 'description: required, max 200 chars');
  req(BASES.includes(m.base), `base: must be one of ${BASES.join(', ')}`);
  req(
    Array.isArray(m.variants) && m.variants.length > 0 && m.variants.every((v) => VARIANTS.includes(v)),
    `variants: non-empty list of ${VARIANTS.join(', ')}`,
  );
  req(
    Array.isArray(m.maintainers) && m.maintainers.length > 0 && m.maintainers.every((u) => GH_USER.test(u)),
    'maintainers: non-empty list of GitHub usernames',
  );
  req(['human', 'ai'].includes(m.authorType), 'authorType: "human" or "ai"');
  req(m.tags === undefined || (Array.isArray(m.tags) && m.tags.length <= 8), 'tags: up to 8 strings');
  req(
    m.fonts === undefined ||
      (Array.isArray(m.fonts) && m.fonts.every((f) => f.startsWith('https://fonts.googleapis.com/'))),
    'fonts: Google Fonts stylesheet URLs only',
  );
  return errors;
}

/** The Sass entry that turns a design into a standalone CSS theme. */
export function entry(slug, m, variant) {
  return `
@use 'igniteui-theming' as *;
@use 'lib' as *;
@use '${DESIGNS_DIR}/${slug}' as ds;

@include palette(ds.$${slug}-${variant}-palette);
@include elevations(ds.$${slug}-elevations);
@include typography($font-family: ds.$${slug}-typeface, $type-scale: ds.$${slug}-type-scale);
@include sizing();
@include spacing();

:root {
    --ig-theme: ${m.base};
    --ig-theme-variant: ${variant};
    @if ds.$${slug}-roundness != null {
        --ig-radius-factor: #{ds.$${slug}-roundness};
    }
}

@include design-tokens(ds.$${variant}-${slug}-schema);
`;
}

export function compile(slug, m, variant) {
  const warnings = [];
  const { css } = sass.compileString(entry(slug, m, variant), {
    loadPaths: ['.', 'node_modules'],
    style: 'compressed',
    logger: {
      warn: (msg, { deprecation }) => deprecation || /repetitive deprecation/.test(msg) || warnings.push(msg),
    },
  });
  const partsFile = join(DESIGNS_DIR, slug, 'parts.css');
  const parts = existsSync(partsFile) ? readFileSync(partsFile, 'utf8') : '';
  return { css: css + (parts ? `\n${parts}` : ''), parts, warnings };
}

/** Reads the seed colors of a compiled palette as [r, g, b] (0-255). */
export function paletteColors(slug, variant) {
  const colors = {};
  const pick = ['primary 500', 'secondary 500', 'surface 500', 'gray 900'];
  const src = `
@use 'sass:color';
@use 'sass:map';
@use '${DESIGNS_DIR}/${slug}' as ds;
${pick
  .map((p) => {
    const [name, shade] = p.split(' ');
    return `$c: color.to-gamut(color.to-space(map.get(ds.$${slug}-${variant}-palette, '${name}', '${shade}-raw'), rgb), $method: clip);
@debug '${p}=#{color.channel($c, "red")},#{color.channel($c, "green")},#{color.channel($c, "blue")}';`;
  })
  .join('\n')}`;
  sass.compileString(src, {
    loadPaths: ['.', 'node_modules'],
    logger: {
      warn() {},
      debug(msg) {
        const [key, rgb] = msg.split('=');
        colors[key] = rgb.split(',').map(Number);
      },
    },
  });
  return colors;
}

function luminance([r, g, b]) {
  const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Accessibility checks on the palette seeds. Mirrors igniteui-theming's MCP palette validator. */
export function checkPalette(slug, variant) {
  const c = paletteColors(slug, variant);
  const errors = [];
  const surfaceL = luminance(c['surface 500']);

  if (variant === 'light' && surfaceL < 0.4) errors.push(`${variant}: surface is too dark for a light variant`);
  if (variant === 'dark' && surfaceL > 0.2) errors.push(`${variant}: surface is too light for a dark variant`);

  const text = contrast(c['gray 900'], c['surface 500']);
  if (text < 4.5) errors.push(`${variant}: gray 900 on surface has contrast ${text.toFixed(2)}, needs >= 4.5 (body text)`);

  const primary = contrast(c['primary 500'], c['surface 500']);
  if (primary < 3) errors.push(`${variant}: primary 500 on surface has contrast ${primary.toFixed(2)}, needs >= 3`);

  return errors;
}

/** parts.css may only target Ignite UI web component parts and may not load anything. */
export function checkParts(parts) {
  const errors = [];
  if (/@import|url\s*\(|expression\s*\(|javascript:/i.test(parts)) {
    errors.push('parts.css: @import, url() and expressions are not allowed');
  }
  const selectors = parts
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{[^}]*\}/g, '\n')
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const s of selectors) {
    if (!/^igc-[a-z-]+(\[[^\]]+\])*(::part\([a-z0-9 -]+\))(:[a-z-]+(\([^)]*\))?)*$/.test(s)) {
      errors.push(`parts.css: selector "${s}" must look like igc-<component>::part(<name>)`);
    }
  }
  return errors;
}
