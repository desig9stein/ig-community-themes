import { configureTheme, defineAllComponents } from 'igniteui-webcomponents';

defineAllComponents();

// Base theme stylesheets shipped by igniteui-webcomponents, e.g. themes/dark/indigo.css.
const baseThemes = import.meta.glob('../../node_modules/igniteui-webcomponents/themes/*/*.css', {
  query: '?url',
  import: 'default',
  eager: true,
});
const baseThemeUrl = (variant, base) =>
  baseThemes[`../../node_modules/igniteui-webcomponents/themes/${variant}/${base}.css`];

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const designs = await (await fetch('./index.json')).json();
const params = new URLSearchParams(location.search);

let design = designs.find((d) => d.slug === params.get('design')) ?? designs[0];
let variant = design.variants.includes(params.get('variant')) ? params.get('variant') : design.variants[0];

$('design').innerHTML = designs.map((d) => `<option value="${esc(d.slug)}">${esc(d.name)}</option>`).join('');

function applyDesign() {
  const baseOnly = $('compare').checked;

  $('base-theme').href = baseThemeUrl(variant, design.base);
  $('design-theme').disabled = baseOnly;
  $('design-theme').href = `./${design.slug}/${variant}.css`;
  configureTheme(design.base, variant);

  for (const href of design.fonts ?? []) {
    if (!document.querySelector(`link[href="${CSS.escape(href)}"]`)) {
      document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href }));
    }
  }

  $('design').value = design.slug;
  $('variant').innerHTML = design.variants.map((v) => `<option>${v}</option>`).join('');
  $('variant').value = variant;
  $('meta').innerHTML = `<span class="pill">base: ${esc(design.base)}</span>${design.maintainers
    .map((m) => `<a class="pill" href="https://github.com/${esc(m)}">@${esc(m)}</a>`)
    .join('')}`;
  $('explain').textContent = `${design.name} extends the ${design.base} base. Its structure (layout, DOM, sizing) comes from ${design.base}; colors, typography, elevations, roundness and component tokens come from the design. Toggle "Show base only" to compare.`;
  document.title = `${design.name} (${variant}) · IG Community Themes`;
  history.replaceState(null, '', `?design=${design.slug}&variant=${variant}`);
  renderUsage();
}

function renderUsage() {
  const { slug, base } = design;
  const snippets = {
    'Angular (Sass)': `// npm i igniteui-community-themes
@use 'igniteui-angular/theming' as *;
@use 'igniteui-community-themes/${slug}' as ds;

@include core();
@include typography($font-family: ds.$${slug}-typeface, $type-scale: ds.$${slug}-type-scale);
@include theme(
  ds.$${slug}-${variant}-palette,
  $schema: ds.$${variant}-${slug}-schema,
  $elevations: ds.$${slug}-elevations,
  $roundness: ds.$${slug}-roundness
);`,
    'Web Components': `<!-- npm i igniteui-community-themes -->
<link rel="stylesheet" href="node_modules/igniteui-webcomponents/themes/${variant}/${base}.css" />
<link rel="stylesheet" href="node_modules/igniteui-community-themes/dist/${slug}/${variant}.css" />
<script type="module">
  import { configureTheme } from 'igniteui-webcomponents';
  configureTheme('${base}', '${variant}');
</script>`,
    Blazor: `<!-- wwwroot/index.html (or App.razor) -->
<link href="_content/IgniteUI.Blazor/themes/${variant}/${base}.css" rel="stylesheet" />
<link href="css/${slug}-${variant}.css" rel="stylesheet" /> <!-- copy of dist/${slug}/${variant}.css -->`,
  };
  $('usage').innerHTML = Object.entries(snippets)
    .map(([title, code]) => `<h3>${title}</h3><pre><code>${esc(code)}</code></pre>`)
    .join('');
}

$('design').addEventListener('change', (e) => {
  design = designs.find((d) => d.slug === e.target.value);
  if (!design.variants.includes(variant)) variant = design.variants[0];
  applyDesign();
});
$('variant').addEventListener('change', (e) => {
  variant = e.target.value;
  applyDesign();
});
$('compare').addEventListener('change', applyDesign);


// --- Weather data (Open-Meteo, no API key) -----------------------------------------------------

const CITIES = [
  { name: 'Sofia', lat: 42.7, lon: 23.32 },
  { name: 'New York', lat: 40.71, lon: -74.01 },
  { name: 'Tokyo', lat: 35.68, lon: 139.69 },
  { name: 'Reykjavík', lat: 64.15, lon: -21.94 },
  { name: 'Cape Town', lat: -33.92, lon: 18.42 },
];

const CONDITIONS = { 0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Fog', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle', 61: 'Rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Snow', 73: 'Snow', 75: 'Heavy snow', 80: 'Showers', 81: 'Showers', 82: 'Showers', 95: 'Thunderstorm' };
const condition = (code) => CONDITIONS[code] ?? 'Mixed';

$('city').innerHTML = CITIES.map((c, i) => `<igc-select-item value="${i}">${c.name}</igc-select-item>`).join('');
$('city').value = '0';
$('city').addEventListener('igcChange', (e) => loadWeather(Number(e.detail.value)));

applyDesign();
loadWeather();

async function loadWeather(index = 0) {
  const city = CITIES[index];
  let data;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(res.statusText);
    data = await res.json();
  } catch {
    data = sampleWeather();
  }
  renderWeather(data);
}

function renderWeather({ current, hourly, daily }) {
  $('temp').textContent = `${Math.round(current.temperature_2m)}°C`;
  $('humidity').textContent = `${current.relative_humidity_2m}%`;
  $('humidity-bar').value = current.relative_humidity_2m;
  $('wind').textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  $('condition').textContent = condition(current.weather_code);
  $('updated').textContent = `Updated ${new Date(current.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const now = hourly.time.findIndex((t) => new Date(t) >= new Date(current.time));
  const hours = [...Array(12).keys()].map((i) => Math.max(now, 0) + i);
  $('hourly').innerHTML = hours
    .map(
      (i) => `<igc-list-item>
        <igc-avatar slot="start" initials="${Math.round(hourly.temperature_2m[i])}°"></igc-avatar>
        <span slot="title">${new Date(hourly.time[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <span slot="subtitle">${condition(hourly.weather_code[i])}</span>
        <igc-chip slot="end">${hourly.precipitation_probability[i] ?? 0}% rain</igc-chip>
      </igc-list-item>`,
    )
    .join('');

  $('daily').innerHTML = daily.time
    .map(
      (t, i) => `<igc-list-item>
        <igc-avatar slot="start" shape="rounded" initials="${new Date(t).toLocaleDateString([], { weekday: 'short' }).slice(0, 2)}"></igc-avatar>
        <span slot="title">${new Date(t).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}</span>
        <span slot="subtitle">${condition(daily.weather_code[i])}</span>
        <span slot="end">${Math.round(daily.temperature_2m_min[i])}° / ${Math.round(daily.temperature_2m_max[i])}°</span>
      </igc-list-item>`,
    )
    .join('');
}

/** Offline fallback so the preview always renders. */
function sampleWeather() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  const hourly = { time: [], temperature_2m: [], precipitation_probability: [], weather_code: [] };
  for (let i = 0; i < 48; i++) {
    hourly.time.push(new Date(start.getTime() + i * 3600e3).toISOString());
    hourly.temperature_2m.push(14 + 6 * Math.sin((i - 6) / 3.8));
    hourly.precipitation_probability.push((i * 17) % 80);
    hourly.weather_code.push([0, 2, 3, 61][i % 4]);
  }
  const daily = { time: [], weather_code: [], temperature_2m_min: [], temperature_2m_max: [] };
  for (let i = 0; i < 7; i++) {
    daily.time.push(new Date(start.getTime() + i * 864e5).toISOString().slice(0, 10));
    daily.weather_code.push([0, 2, 61, 3, 80, 0, 1][i]);
    daily.temperature_2m_min.push(8 + i);
    daily.temperature_2m_max.push(18 + (i % 3));
  }
  return {
    current: { time: start.toISOString(), temperature_2m: 17, relative_humidity_2m: 62, wind_speed_10m: 14, weather_code: 2 },
    hourly,
    daily,
  };
}
