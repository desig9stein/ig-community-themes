import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { defineConfig } from 'vite';

const ANGULAR_DIR = resolve('_site/angular');
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const NOT_BUILT = `<!doctype html><meta charset="utf-8"><title>Angular preview not built</title>
<body style="font:16px system-ui;max-width:640px;margin:64px auto;line-height:1.5">
<h1>The Angular grid preview isn't built yet</h1>
<p>It is a separate Angular app (<code>apps/angular</code>) compiled with Angular's own Sass API. Build it once, then reload:</p>
<pre style="background:#eee;padding:12px">npm --prefix apps/angular install   # first time only
npm run build:angular                # Node &ge; 22.22.3 (Angular CLI 22)</pre>
<p>Re-run <code>npm run build:angular</code> after changing a design.</p></body>`;

/**
 * Serves the separately built Angular preview (_site/angular) at /angular/ in dev and preview,
 * and redirects /angular → /angular/ so its relative URLs resolve.
 */
function angularPreview() {
  const middleware = (req, res, next) => {
    const url = new URL(req.url, 'http://local');
    if (url.pathname === '/angular') {
      res.writeHead(301, { Location: `/angular/${url.search}` }).end();
      return;
    }
    if (!url.pathname.startsWith('/angular/')) return next();

    if (!existsSync(join(ANGULAR_DIR, 'index.html'))) {
      res.writeHead(200, { 'Content-Type': 'text/html' }).end(NOT_BUILT);
      return;
    }
    const rel = normalize(decodeURIComponent(url.pathname.slice('/angular/'.length))).replace(/^(\.\.[/\\])+/, '');
    let file = join(ANGULAR_DIR, rel);
    if (!rel || !existsSync(file) || statSync(file).isDirectory()) file = join(ANGULAR_DIR, 'index.html');
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
  };

  return {
    name: 'angular-preview',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

// The site lives in site/, the compiled designs (dist/) are served as static files next to it.
export default defineConfig({
  root: 'site',
  base: './',
  publicDir: resolve('dist'),
  plugins: [angularPreview()],
  build: {
    outDir: resolve('_site'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve('site/index.html'),
        preview: resolve('site/preview.html'),
        states: resolve('site/states.html'),
      },
    },
  },
});
