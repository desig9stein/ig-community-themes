// Visual + contrast review for designs. Builds nothing: run `npm run build:site` first.
// For every design × variant it renders the WC states page, the WC dashboard and the Angular grid page,
// drives real interactions (hover, keyboard focus, press, menus, dialogs), screenshots each state next to
// the same state in the plain base theme, and runs axe-core color-contrast on both. A contrast violation
// only counts against the design when the base theme doesn't have it too.
//
// Usage: npm run review -- [slug ...] [--variants light,dark] [--no-angular] [--strict]
// Output: review/<slug>/index.html (contact sheet) + review/<slug>/report.json
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { preview } from 'vite';
import { listDesigns, readManifest } from './design.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    variants: { type: 'string' },
    'no-angular': { type: 'boolean', default: false },
    strict: { type: 'boolean', default: false },
  },
});

const slugs = positionals.length ? positionals : listDesigns();
const server = await preview({ preview: { port: 0, open: false }, logLevel: 'silent' });
const origin = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await chromium.launch();
let newViolations = 0;

// ---- scenarios ---------------------------------------------------------------------------------------

/** Each scenario: { id, title, page: 'states'|'preview'|'angular', run(page) -> [{ name, shot: Buffer }] } */
const settle = (page, ms = 400) => page.waitForTimeout(ms);

async function liveStates(page) {
  const shots = [];
  const rows = await page.$$eval('.cells[data-row]', (els) => els.map((e) => e.dataset.row));
  for (const row of rows) {
    const cells = page.locator(`.cells[data-row="${row}"]`);
    const live = cells.locator('[data-live]').first();
    await page.mouse.move(0, 0);
    await page.evaluate(() => document.activeElement?.blur());
    await settle(page, 150);
    shots.push({ name: `${row} · idle`, shot: await cells.screenshot() });

    await live.hover();
    await settle(page, 250);
    shots.push({ name: `${row} · hover`, shot: await cells.screenshot() });

    // Real keyboard focus: click the (non-focusable) row label, then Tab into the live element.
    await page.mouse.move(0, 0);
    await page.locator(`.name[data-row="${row}"]`).click();
    await page.keyboard.press('Tab');
    await settle(page, 250);
    shots.push({ name: `${row} · focus-visible`, shot: await cells.screenshot() });

    const box = await live.boundingBox();
    if (box) {
      await page.mouse.move(box.x + Math.min(24, box.width / 2), box.y + Math.min(20, box.height / 2));
      await page.mouse.down();
      await settle(page, 150);
      shots.push({ name: `${row} · active (pressed)`, shot: await cells.screenshot() });
      await page.mouse.up();
    }
    await page.keyboard.press('Escape');
  }
  return shots;
}

const clickText = (page, text) => page.getByText(text, { exact: true }).first().click();

const SCENARIOS = [
  { id: 'states', title: 'Web Components · every state', page: 'states', run: liveStates },
  {
    id: 'dashboard',
    title: 'Web Components · dashboard',
    page: 'preview',
    run: async (page) => [{ name: 'dashboard', shot: await page.locator('.dash').screenshot() }],
  },
  {
    id: 'angular',
    title: 'Angular · hierarchical grid and controls',
    page: 'angular',
    run: async (page) => {
      const hgrid = page.locator('#hgrid');
      const rows = hgrid.locator('igx-hierarchical-grid-row');
      const reset = async () => {
        await page.keyboard.press('Escape');
        await page.mouse.click(5, 5);
        await settle(page, 300);
      };
      // [name, action, what to capture]. Steps are independent: a failing step is reported and skipped.
      const steps = [
        ['hierarchical grid', async () => {}, hgrid],
        ['rows selected + hover', async () => {
          await rows.nth(1).locator('.igx-grid__cbx-selection').click();
          await rows.nth(2).locator('.igx-grid__cbx-selection').click();
          await rows.nth(4).hover();
        }, hgrid],
        ['cell focus (keyboard)', async () => {
          await rows.nth(3).locator('igx-hierarchical-grid-cell').nth(1).click();
          await page.keyboard.press('ArrowRight');
        }, hgrid],
        ['row island expanded', async () => {
          await rows.first().locator('.igx-grid__hierarchical-expander').click();
          await settle(page, 800);
        }, hgrid],
        ['excel-style filter menu', async () => {
          await reset();
          const header = hgrid.locator('igx-grid-header-group').filter({ hasText: 'Country' }).first();
          await header.hover();
          await header.locator('.igx-excel-filter__icon').click();
          await settle(page, 700);
        }, page],
        ['toolbar · column hiding', async () => {
          await reset();
          await hgrid.locator('igx-grid-toolbar-hiding button').first().click();
          await settle(page, 500);
        }, page],
        ['toolbar · export menu', async () => {
          await reset();
          await hgrid.locator('igx-grid-toolbar-exporter button').first().click();
          await settle(page, 500);
        }, page],
        ['advanced filtering (query builder dialog)', async () => {
          await reset();
          await hgrid.locator('igx-grid-toolbar-advanced-filtering button').first().click();
          await settle(page, 800);
        }, page],
        ['row editing', async () => {
          await reset();
          await rows.nth(0).locator('igx-hierarchical-grid-cell').nth(1).dblclick();
          await settle(page, 500);
        }, hgrid],
        ['action strip', async () => {
          await reset();
          await rows.nth(5).hover();
          await settle(page, 500);
        }, hgrid],
        ['grid · group by + summaries', async () => reset(), page.locator('#grid')],
        ['grid · filter row active', async () => {
          await page.locator('#grid igx-grid-filtering-cell igx-chip').first().click();
          await settle(page, 500);
        }, page.locator('#grid')],
        ['query builder + calendar', async () => reset(), page.locator('section.two-col')],
        ['controls', async () => {}, page.locator('.controls')],
        ['combo open', async () => {
          await page.locator('.controls igx-combo .igx-input-group__bundle').click();
          await settle(page, 500);
        }, page],
        ['date picker open', async () => {
          await reset();
          await page.locator('.controls igx-date-picker igx-prefix').click();
          await settle(page, 600);
        }, page],
        ['tooltip', async () => {
          await reset();
          await page.getByText('Hover for tooltip').hover();
          await settle(page, 900);
        }, page.locator('.controls')],
        ['dialog', async () => {
          await reset();
          await page.getByText('Open dialog').click();
          await settle(page, 600);
        }, page],
      ];

      const shots = [];
      for (const [name, action, target] of steps) {
        try {
          await action();
          await target.scrollIntoViewIfNeeded?.().catch(() => {});
          shots.push({ name, shot: await target.screenshot({ timeout: 5000 }) });
        } catch (e) {
          shots.push({ name: `${name} — step failed: ${e.message.split('\n')[0]}`, shot: await page.screenshot() });
        }
      }
      return shots;
    },
  },
];

const url = (scenario, slug, variant, baseOnly) => {
  const q = `design=${slug}&variant=${variant}&base=${baseOnly ? 1 : 0}`;
  return { states: `/states.html?${q}`, preview: `/preview.html?${q}`, angular: `/angular/?${q}` }[scenario.page];
};

async function contrast(page) {
  await page.addScriptTag({ content: AXE });
  const { violations } = await page.evaluate(() =>
    window.axe.run({ exclude: [['igc-trial-watermark']] }, { runOnly: ['color-contrast'], resultTypes: ['violations'] }),
  );
  return (violations[0]?.nodes ?? []).map((n) => ({
    target: n.target.flat().join(' > '),
    html: n.html.slice(0, 160),
    summary: n.any[0]?.message ?? '',
  }));
}

async function capture(slug, variant, scenario, baseOnly) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(5000);
  await page.goto(origin + url(scenario, slug, variant, baseOnly));
  await settle(page, 2000);
  const issues = await contrast(page);
  let shots = [];
  try {
    shots = await scenario.run(page);
  } catch (e) {
    shots.push({ name: `error: ${e.message.split('\n')[0]}`, shot: await page.screenshot() });
  }
  await page.close();
  return { issues, shots };
}

/** Writes compact, labeled composites of the design shots (sheet-<variant>-<scenario>-<n>.png), handy for a quick look. */
async function composeSheets(out, items) {
  const groups = Object.groupBy(items, (i) => i.group);
  const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
  for (const [group, list] of Object.entries(groups)) {
    for (let i = 0; i < list.length; i += 12) {
      const chunk = list.slice(i, i + 12);
      await page.setContent(
        `<style>body{margin:0;padding:12px;font:13px system-ui;background:#ddd;display:grid;grid-template-columns:1fr 1fr;gap:10px}
        figure{margin:0;background:#fff;padding:6px}figcaption{font-weight:600;margin-bottom:4px}img{max-width:100%;display:block}</style>
        ${chunk.map((c) => `<figure><figcaption>${c.name}</figcaption><img src="data:image/png;base64,${readFileSync(join(out, c.file)).toString('base64')}"></figure>`).join('')}`,
      );
      await page.waitForTimeout(100);
      await page.screenshot({ path: join(out, `sheet-${group}-${i / 12}.png`), fullPage: true });
    }
  }
  await page.close();
}

// ---- run ---------------------------------------------------------------------------------------------

for (const slug of slugs) {
  const manifest = readManifest(slug);
  const variants = values.variants ? values.variants.split(',') : manifest.variants;
  const out = join('review', slug);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const report = { slug, variants: {} };
  const sections = [];
  const sheets = [];

  for (const variant of variants) {
    report.variants[variant] = {};
    for (const scenario of SCENARIOS) {
      if (scenario.page === 'angular' && values['no-angular']) continue;
      const design = await capture(slug, variant, scenario, false);
      const base = await capture(slug, variant, scenario, true);
      const baseTargets = new Set(base.issues.map((i) => i.target));
      const fresh = design.issues.filter((i) => !baseTargets.has(i.target));
      newViolations += fresh.length;
      report.variants[variant][scenario.id] = { contrast: { design: design.issues.length, base: base.issues.length, new: fresh } };

      const rows = design.shots.map((s, i) => {
        const file = `${variant}-${scenario.id}-${i}`;
        writeFileSync(join(out, `${file}.png`), s.shot);
        if (base.shots[i]) writeFileSync(join(out, `${file}-base.png`), base.shots[i].shot);
        sheets.push({ group: `${variant}-${scenario.id}`, name: s.name, file: `${file}.png` });
        return `<figure><figcaption>${s.name}</figcaption><div class="pair"><img src="${file}.png"><img src="${file}-base.png"></div></figure>`;
      });
      sections.push(`<section><h2>${variant} · ${scenario.title}</h2>
        <p class="${fresh.length ? 'bad' : 'ok'}">Contrast: ${fresh.length} new violation(s) vs base (design ${design.issues.length}, base ${base.issues.length})</p>
        ${fresh.length ? `<ul>${fresh.map((f) => `<li><code>${f.target}</code> ${f.summary}</li>`).join('')}</ul>` : ''}
        ${rows.join('')}</section>`);
      console.log(`${fresh.length ? '✗' : '✓'} ${slug}/${variant}/${scenario.id}: ${fresh.length} new contrast issue(s), ${design.shots.length} shots`);
    }
  }

  writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
  await composeSheets(out, sheets);
  writeFileSync(
    join(out, 'index.html'),
    `<!doctype html><meta charset="utf-8"><title>Review · ${slug}</title>
<style>body{font:14px system-ui;margin:24px;background:#eee}figure{margin:0 0 24px}figcaption{font-weight:600;margin-bottom:6px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pair img{max-width:100%;border:1px solid #bbb;background:#fff}
.bad{color:#b00020;font-weight:600}.ok{color:#11702f}h2{margin-top:40px}</style>
<h1>${manifest.name} — design (left) vs ${manifest.base} base (right)</h1>${sections.join('\n')}`,
  );
  console.log(`→ ${join(out, 'index.html')}`);
}

await browser.close();
await server.close();
if (values.strict && newViolations) process.exit(1);
