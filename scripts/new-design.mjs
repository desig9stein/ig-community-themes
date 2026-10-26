// Scaffolds a design from designs/_template.
// Usage: npm run new -- <slug> --base <material|bootstrap|fluent|indigo> [--name "Pretty Name"] [--maintainer gh-user]
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { BASES, DESIGNS_DIR } from './design.mjs';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    base: { type: 'string', default: 'material' },
    name: { type: 'string' },
    maintainer: { type: 'string', default: 'your-github-username' },
  },
});

const slug = positionals[0];
if (!slug || !/^[a-z][a-z0-9-]{1,39}$/.test(slug)) {
  console.error('Usage: npm run new -- <slug> --base <material|bootstrap|fluent|indigo>');
  process.exit(1);
}
if (!BASES.includes(values.base)) {
  console.error(`--base must be one of ${BASES.join(', ')}`);
  process.exit(1);
}

const target = join(DESIGNS_DIR, slug);
if (existsSync(target)) {
  console.error(`${target} already exists`);
  process.exit(1);
}

const name = values.name ?? slug.replace(/(^|-)(\w)/g, (_, s, c) => (s ? ' ' : '') + c.toUpperCase());
cpSync(join(DESIGNS_DIR, '_template'), target, { recursive: true });

for (const file of readdirSync(target)) {
  const path = join(target, file);
  writeFileSync(
    path,
    readFileSync(path, 'utf8')
      .replaceAll('__SLUG__', slug)
      .replaceAll('__BASE__', values.base)
      .replaceAll('__NAME__', name)
      .replaceAll('__MAINTAINER__', values.maintainer),
  );
}

console.log(`Created ${target}. Next: edit _index.scss + manifest.json, then npm run validate -- ${slug} && npm run dev`);
