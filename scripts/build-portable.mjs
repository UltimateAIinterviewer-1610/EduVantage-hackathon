import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let html = readFileSync(join(root, 'dist/index.html'), 'utf8');
const scriptPath = html.match(/<script type="module" crossorigin src="([^"]+)"\><\/script>/)?.[1];
const stylePath = html.match(/<link rel="stylesheet" crossorigin href="([^"]+)"\>/)?.[1];
if (!scriptPath || !stylePath) throw new Error('Could not find the built JavaScript or stylesheet.');
let js = readFileSync(join(root, 'dist', scriptPath.replace(/^\//, '')), 'utf8');
// Keep lazy PDF extraction available when this launcher is opened from file://.
js = js.replace(/import\("(\.\/pdf-[^"/]+\.js)"\)/g, (_, path) => {
  const asset = readFileSync(join(root, 'dist/assets', path.slice(2)));
  return `import("data:text/javascript;base64,${asset.toString('base64')}")`;
});
js = js.replace(/"(\/assets\/pdf\.worker\.min-[^"/]+\.mjs)"/g, (_, path) => {
  const asset = readFileSync(join(root, 'dist', path.slice(1)));
  return `"data:text/javascript;base64,${asset.toString('base64')}"`;
});
js = js.replace(/<\/script/gi, '<\\/script');
const css = readFileSync(join(root, 'dist', stylePath.replace(/^\//, '')), 'utf8').replace(/<\/style/gi, '<\\/style');
html = html.replace(/\s*<script id="file-launcher">[\s\S]*?<\/script>/, '');
html = html.replace(/\s*<script type="importmap">[\s\S]*?<\/script>/, '');
html = html.replace(/<script type="module" crossorigin src="[^"]+"\><\/script>/, () => `<script type="module">${js}</script>`);
html = html.replace(/<link rel="stylesheet" crossorigin href="[^"]+"\>/, () => `<style>${css}</style>`);
html = html.replace('<title>EduVantage AI Live</title>', '<title>EduVantage — Open Classroom</title>');
writeFileSync(join(root, 'Start-EduVantage.html'), html);
console.log('Created Start-EduVantage.html — open this file in a standard browser.');
