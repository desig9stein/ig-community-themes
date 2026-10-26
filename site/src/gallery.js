const gallery = document.getElementById('gallery');
const designs = await (await fetch('./index.json')).json();

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

gallery.innerHTML = designs
  .map((d) => {
    const sw = d.swatches[d.variants[0]];
    return `
    <article class="design-card">
      <h2>${esc(d.name)}</h2>
      <div class="swatches">${['surface', 'primary', 'secondary', 'gray']
        .map((k) => `<span title="${k}" style="background:${esc(sw[k])}"></span>`)
        .join('')}</div>
      <p>${esc(d.description)}</p>
      <div class="meta">
        <span class="pill">base: ${esc(d.base)}</span>
        <span class="pill">${d.authorType === 'ai' ? 'AI-authored' : 'human-authored'}</span>
        ${d.maintainers.map((m) => `<a class="pill" href="https://github.com/${esc(m)}">@${esc(m)}</a>`).join('')}
      </div>
      <div class="links">
        ${d.variants.map((v) => `<a href="./preview.html?design=${esc(d.slug)}&variant=${v}">Preview ${v}</a>`).join('')}
      </div>
    </article>`;
  })
  .join('');
