// Shared design / variant / "base only" controls for the WC pages.
const baseThemes = import.meta.glob('../../node_modules/igniteui-webcomponents/themes/*/*.css', {
  query: '?url',
  import: 'default',
  eager: true,
});
const baseThemeUrl = (variant, base) =>
  baseThemes[`../../node_modules/igniteui-webcomponents/themes/${variant}/${base}.css`];

const $ = (id) => document.getElementById(id);
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Wires #design, #variant and #compare, swaps #base-theme / #design-theme and keeps the URL in sync.
 * @param {{ onApply?: (state: { design: object, base: string, variant: string, baseOnly: boolean }) => void }} options
 */
export async function setupDesignControls({ onApply } = {}) {
  const designs = await (await fetch('./index.json')).json();
  const params = new URLSearchParams(location.search);

  let design = designs.find((d) => d.slug === params.get('design')) ?? designs[0];
  let variant = design.variants.includes(params.get('variant')) ? params.get('variant') : design.variants[0];
  $('compare').checked = params.get('base') === '1';

  $('design').innerHTML = designs.map((d) => `<option value="${esc(d.slug)}">${esc(d.name)}</option>`).join('');

  const apply = () => {
    const baseOnly = $('compare').checked;
    $('base-theme').href = baseThemeUrl(variant, design.base);
    $('design-theme').href = `./${design.slug}/${variant}.css`;
    $('design-theme').disabled = baseOnly;

    for (const href of design.fonts ?? []) {
      if (!document.querySelector(`link[href="${CSS.escape(href)}"]`)) {
        document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href }));
      }
    }

    $('design').value = design.slug;
    $('variant').innerHTML = design.variants.map((v) => `<option>${v}</option>`).join('');
    $('variant').value = variant;
    document.documentElement.dataset.variant = variant;

    const query = `?design=${design.slug}&variant=${variant}&base=${baseOnly ? 1 : 0}`;
    history.replaceState(null, '', query);
    for (const [id, page] of [['to-preview', './preview.html'], ['to-states', './states.html'], ['to-angular', './angular/']]) {
      if ($(id)) $(id).href = page + query;
    }
    onApply?.({ design, base: design.base, variant, baseOnly });
  };

  $('design').addEventListener('change', (e) => {
    design = designs.find((d) => d.slug === e.target.value);
    if (!design.variants.includes(variant)) variant = design.variants[0];
    apply();
  });
  $('variant').addEventListener('change', (e) => {
    variant = e.target.value;
    apply();
  });
  $('compare').addEventListener('change', apply);

  apply();
  return designs;
}
