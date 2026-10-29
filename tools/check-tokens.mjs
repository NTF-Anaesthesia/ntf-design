// Fails when public/v1/tokens.css no longer holds the fonts and tokens of public/v1/app.css word for word: the core
// apps read tokens.css, the older apps app.css, so the two must show the same colours, type and space.
// Run: node tools/check-tokens.mjs
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../public/v1/app.css', import.meta.url), 'utf8');
const tokens = readFileSync(new URL('../public/v1/tokens.css', import.meta.url), 'utf8');
// the shared part: the @font-face lines, then the :root tokens and the reduced-motion block (up to the "Base" heading)
const fonts = app.match(/^@font-face.*$/gm) ?? [];
const block = app.slice(app.indexOf('/* ---------- Tokens'), app.indexOf('/* html.app--still'));
const missing = [...fonts, block.trim()].filter(part => !tokens.includes(part));
if (!block.trim() || fonts.length === 0) { console.error('check-tokens: app.css has no tokens block'); process.exit(1); }
if (missing.length) {
  console.error('check-tokens: tokens.css differs from app.css in:\n' + missing.map(m => '  ' + m.split('\n')[0]).join('\n'));
  process.exit(1);
}
console.log(`check-tokens: tokens.css matches app.css (${fonts.length} fonts, ${block.split('\n').length} token lines)`);
