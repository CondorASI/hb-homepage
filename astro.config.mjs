// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

/** Rewrites root-absolute /_astro/ URLs (fonts) to relative ones so dist/index.html also works when opened straight from disk. */
function relativeAssets() {
  return {
    name: 'relative-assets',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const { readFile, writeFile } = await import('node:fs/promises');
        const file = new URL('index.html', dir);
        const html = await readFile(file, 'utf8');
        await writeFile(file, html.replaceAll('url(/_astro/', 'url(_astro/').replaceAll('href="/_astro/', 'href="_astro/').replaceAll('src="/_astro/', 'src="_astro/'));
      },
    },
  };
}

export default defineConfig({
  integrations: [relativeAssets()],
  site: 'https://www.h-b.nu',
  output: 'static',
  build: { inlineStylesheets: 'always' }, // one ~30 kB stylesheet: inlining removes the only render-blocking request
  vite: { plugins: [tailwindcss()] },
});
