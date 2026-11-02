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

/** Pixels whose color moved by more than `delta` (0-255, max channel) between two PNG screenshots. */
async function changedPixels(page, a, b, delta = 12) {
  return page.evaluate(
    async ([a, b, delta]) => {
      const load = (src) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = `data:image/png;base64,${src}`;
        });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const w = Math.min(ia.width, ib.width);
      const h = Math.min(ia.height, ib.height);
      const px = (img) => {
        const c = new OffscreenCanvas(w, h).getContext('2d');
        c.drawImage(img, 0, 0);
        return c.getImageData(0, 0, w, h).data;
      };
      const [da, db] = [px(ia), px(ib)];
      let n = 0;
      for (let i = 0; i < da.length; i += 4) {
        if (Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2])) > delta) n++;
      }
      return n;
    },
    [a.toString('base64'), b.toString('base64'), delta],
  );
}

/** A state counts as visible when at least this many pixels changed noticeably vs idle (~ a 1px ring on a button). */
const VISIBLE_PIXELS = 150;

/** Deep activeElement (through shadow roots) is inside `cells`. */
const focusInside = (cells) =>
  cells.evaluate((el) => {
    let a = document.activeElement;
    while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
    const host = (n) => n && (n.getRootNode()?.host ?? null);
    for (let n = a; n; n = n.parentElement ?? host(n)) if (n === el) return true;
    return false;
  });

/**
 * Real keyboard focus on `target`: programmatically focus the tabbable element right before it, then press Tab.
 * Frameworks style keyboard focus only for real Tab navigation (e.g. igxButton), so `.focus()` alone isn't enough.
 */
async function tabInto(page, target) {
  const prepared = await target.evaluate((el) => {
    const tabbable = [...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter(
      (n) => n.tabIndex >= 0 && !n.disabled && n.getClientRects().length,
    );
    const own = tabbable.find((n) => n === el || el.contains(n));
    const i = own ? tabbable.indexOf(own) : tabbable.findIndex((n) => el.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING) ;
    const prev = tabbable[i - 1];
    if (!prev) return false;
    prev.focus();
    return true;
  });
  if (!prepared) return false;
  await page.keyboard.press('Tab');
  return target.evaluate((el) => {
    let a = document.activeElement;
    while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
    const up = (n) => n.parentElement ?? n.getRootNode()?.host ?? null;
    for (let n = a; n; n = up(n)) if (n === el) return true;
    return false;
  });
}

async function liveStates(page) {
  const shots = [];
  const states = [];
  const rows = await page.$$eval('.cells[data-row]', (els) => els.map((e) => [e.dataset.row, e.dataset.target]));
  for (const [row, targetSel] of rows) {
    const cells = page.locator(`.cells[data-row="${row}"]`);
    const reset = async () => {
      await page.mouse.move(0, 0);
      await page.evaluate(() => document.activeElement?.blur());
      await settle(page, 150);
    };
    await reset();
    const idle = await cells.screenshot();
    shots.push({ name: `${row} · idle`, shot: idle });
    if (targetSel === 'static') continue;

    const target = cells.locator(`${targetSel} >> visible=true`).first();
    const record = (state, shot, visible) => {
      states.push({ row, state, visible });
      shots.push({ name: `${row} · ${state}${visible ? '' : ' — NO VISIBLE CHANGE'}`, shot });
    };

    try {
    await target.hover();
    await settle(page, 250);
    let shot = await cells.screenshot();
    record('hover', shot, (await changedPixels(page, idle, shot)) >= VISIBLE_PIXELS);

    // Real keyboard focus: click the (non-focusable) row label, then Tab until focus lands inside the row.
    await reset();
    await page.locator(`.name[data-row="${row}"]`).click();
    let inside = false;
    for (let i = 0; i < 4 && !inside; i++) {
      await page.keyboard.press('Tab');
      inside = await focusInside(cells);
    }
    if (inside) {
      await settle(page, 250);
      shot = await cells.screenshot();
      record('focus-visible', shot, (await changedPixels(page, idle, shot)) >= VISIBLE_PIXELS);
    }

    await reset();
    const box = await target.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await settle(page, 150);
      shot = await cells.screenshot();
      record('active (pressed)', shot, (await changedPixels(page, idle, shot)) >= VISIBLE_PIXELS);
      await page.mouse.up();
    }
    await page.keyboard.press('Escape');
    } catch (e) {
      shots.push({ name: `${row} — step failed: ${e.message.split('\n')[0]}`, shot: await cells.screenshot() });
    }
  }
  shots.states = states;
  return shots;
}

// Angular controls: [name, selector, nth]. Each is hovered, keyboard-focused and pressed; crops are taken around it.
const ANGULAR_TARGETS = [
  ['contained button', '.controls button[igxButton="contained"]:not([disabled])', 0],
  ['outlined button', '.controls button[igxButton="outlined"]', 0],
  ['flat button', '.controls button[igxButton="flat"]', 0],
  ['fab button', '.controls button[igxButton="fab"]', 0],
  ['icon button · flat', '.controls button[igxIconButton="flat"]', 0],
  ['icon button · outlined', '.controls button[igxIconButton="outlined"]', 0],
  ['icon button · contained', '.controls button[igxIconButton="contained"]', 0],
  ['chip', '.controls igx-chip', 0],
  ['checkbox', '.controls igx-checkbox', 1],
  ['radio', '.controls igx-radio', 1],
  ['switch', '.controls igx-switch', 1],
  ['slider thumb', '.controls igx-thumb.igx-slider-thumb-to', 0],
  ['input', '.controls igx-input-group input', 0],
  ['tab', '.controls igx-tab-header:not(.igx-tab-header--selected):not(.igx-tab-header--disabled)', 0],
  ['list item', '.controls igx-list-item', 2],
  ['expansion panel header', '.controls igx-expansion-panel-header', 0],
  ['calendar day', 'section.two-col igx-day-item:not(.igx-day-item--inactive)', 10],
  ['grid toolbar button', '#hgrid igx-grid-toolbar-pinning button', 0],
  ['paginator button', '#hgrid igx-paginator button.igx-icon-button:not(.igx-button--disabled)', 0],
  ['grid header (sortable)', '#hgrid igx-grid-header-group', 2],
];

async function angularStates(page) {
  const shots = [];
  const states = [];
  const vp = page.viewportSize();
  for (const [name, selector, nth] of ANGULAR_TARGETS) {
    const target = page.locator(selector).nth(nth);
    if (!(await target.count())) {
      states.push({ row: name, state: 'missing', visible: true });
      continue;
    }
    await target.scrollIntoViewIfNeeded();
    const reset = async () => {
      await page.mouse.move(0, 0);
      await page.evaluate(() => document.activeElement?.blur());
      await settle(page, 200);
    };
    await reset();
    const b = await target.boundingBox();
    const pad = 16;
    const clip = {
      x: Math.max(0, b.x - pad),
      y: Math.max(0, b.y - pad),
      width: Math.min(vp.width - Math.max(0, b.x - pad), b.width + pad * 2),
      height: Math.min(vp.height - Math.max(0, b.y - pad), b.height + pad * 2),
    };
    const crop = () => page.screenshot({ clip });
    const idle = await crop();
    shots.push({ name: `${name} · idle`, shot: idle });
    const record = async (state) => {
      const shot = await crop();
      const visible = (await changedPixels(page, idle, shot)) >= VISIBLE_PIXELS;
      states.push({ row: name, state, visible });
      shots.push({ name: `${name} · ${state}${visible ? '' : ' — NO VISIBLE CHANGE'}`, shot });
    };

    await target.hover();
    await settle(page, 300);
    await record('hover');

    await reset();
    if (await tabInto(page, target)) {
      await settle(page, 250);
      await record('focus-visible');
    }

    await reset();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await settle(page, 150);
    await record('active (pressed)');
    await page.mouse.up();
    await page.keyboard.press('Escape');
    await reset();
  }
  shots.states = states;
  return shots;
}

const clickText = (page, text) => page.getByText(text, { exact: true }).first().click();

const SCENARIOS = [
  { id: 'states', title: 'Web Components · every state', page: 'states', run: liveStates },
  { id: 'angular-states', title: 'Angular · control states', page: 'angular', run: angularStates },
  {
    id: 'dashboard',
    title: 'Web Components · dashboard',
    page: 'preview',
    run: async (page) => {
      // Live weather (or the offline fallback after the 5s fetch timeout) must be on screen first.
      await page.waitForFunction(() => document.getElementById('temp')?.textContent !== '–', null, { timeout: 8000 }).catch(() => {});
      return [{ name: 'dashboard', shot: await page.locator('.dash').screenshot() }];
    },
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
  return { issues, shots, states: shots.states ?? [] };
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
      // Interactive states with no visible change. Invisible keyboard focus is an error (WCAG 2.4.7)
      // even when the base theme has the same gap; flat hover / pressed states are warnings.
      const invisible = design.states.filter((st) => !st.visible);
      const noFocus = invisible.filter((st) => st.state === 'focus-visible');
      const flat = invisible.filter((st) => st.state !== 'focus-visible');
      newViolations += noFocus.length;
      report.variants[variant][scenario.id] = {
        contrast: { design: design.issues.length, base: base.issues.length, new: fresh },
        invisibleFocus: noFocus.map((st) => st.row),
        flatStates: flat.map((st) => `${st.row} · ${st.state}`),
      };

      const rows = design.shots.map((s, i) => {
        const file = `${variant}-${scenario.id}-${i}`;
        writeFileSync(join(out, `${file}.png`), s.shot);
        if (base.shots[i]) writeFileSync(join(out, `${file}-base.png`), base.shots[i].shot);
        sheets.push({ group: `${variant}-${scenario.id}`, name: s.name, file: `${file}.png` });
        return `<figure><figcaption>${s.name}</figcaption><div class="pair"><img src="${file}.png"><img src="${file}-base.png"></div></figure>`;
      });
      sections.push(`<section><h2>${variant} · ${scenario.title}</h2>
        <p class="${fresh.length ? 'bad' : 'ok'}">Contrast: ${fresh.length} new violation(s) vs base (design ${design.issues.length}, base ${base.issues.length})</p>
        ${noFocus.length ? `<p class="bad">Invisible keyboard focus: ${noFocus.map((st) => st.row).join(', ')}</p>` : ''}
        ${flat.length ? `<p class="warn">No visible change: ${flat.map((st) => `${st.row} · ${st.state}`).join(', ')}</p>` : ''}
        ${fresh.length ? `<ul>${fresh.map((f) => `<li><code>${f.target}</code> ${f.summary}</li>`).join('')}</ul>` : ''}
        ${rows.join('')}</section>`);
      const status = fresh.length || noFocus.length ? '✗' : '✓';
      const extra = design.states.length ? `, ${noFocus.length} invisible focus, ${flat.length} flat hover/pressed` : '';
      console.log(`${status} ${slug}/${variant}/${scenario.id}: ${fresh.length} new contrast issue(s)${extra}, ${design.shots.length} shots`);
      if (noFocus.length) console.log(`    invisible focus: ${noFocus.map((st) => st.row).join(', ')}`);
      if (flat.length) console.log(`    flat: ${flat.map((st) => `${st.row}·${st.state}`).join(', ')}`);
    }
  }

  writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
  await composeSheets(out, sheets);
  writeFileSync(
    join(out, 'index.html'),
    `<!doctype html><meta charset="utf-8"><title>Review · ${slug}</title>
<style>body{font:14px system-ui;margin:24px;background:#eee}figure{margin:0 0 24px}figcaption{font-weight:600;margin-bottom:6px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pair img{max-width:100%;border:1px solid #bbb;background:#fff}
.bad{color:#b00020;font-weight:600}.warn{color:#8a5a00}.ok{color:#11702f}h2{margin-top:40px}</style>
<h1>${manifest.name} — design (left) vs ${manifest.base} base (right)</h1>${sections.join('\n')}`,
  );
  console.log(`→ ${join(out, 'index.html')}`);
}

await browser.close();
await server.close();
if (values.strict && newViolations) process.exit(1);
