// Validates designs: manifest, compilation (unknown components/arguments fail here) and palette contrast.
// Usage: npm run validate [-- <slug> ...]
import { listDesigns, readManifest, checkManifest, compile, checkPalette } from './design.mjs';

const slugs = process.argv.slice(2).length ? process.argv.slice(2) : listDesigns();
let failed = 0;

for (const slug of slugs) {
  const errors = [];
  let manifest;

  try {
    manifest = readManifest(slug);
    errors.push(...checkManifest(slug, manifest));
  } catch (e) {
    errors.push(`manifest.json: ${e.message}`);
  }

  if (!errors.length) {
    for (const variant of manifest.variants) {
      try {
        const { warnings } = compile(slug, manifest, variant);
        errors.push(...checkPalette(slug, variant));
        warnings.forEach((w) => console.warn(`  ! ${slug}/${variant}: ${w.split('\n')[0]}`));
      } catch (e) {
        errors.push(`${variant}: ${e.message.split('\n')[0]}`);
      }
    }
  }

  if (errors.length) {
    failed++;
    console.error(`✗ ${slug}\n  - ${errors.join('\n  - ')}`);
  } else {
    console.log(`✓ ${slug}`);
  }
}

process.exit(failed ? 1 : 0);
