// Copies ../goal-tracker.html into www/index.html for the Android app and adds the Capacitor
// runtime next to it. The web file itself stays untouched and network-free.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const www = join(root, 'www');
mkdirSync(www, { recursive: true });
let html = readFileSync(join(root, '..', 'goal-tracker.html'), 'utf8');
const tag = '<script src="capacitor.js"></script>';
if (!html.includes(tag)) html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + tag);
if (!html.includes(tag)) throw new Error('could not insert the Capacitor runtime tag');
writeFileSync(join(www, 'index.html'), html);
copyFileSync(join(root, 'node_modules', '@capacitor', 'core', 'dist', 'capacitor.js'), join(www, 'capacitor.js'));
const v = (html.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/) || [])[1];
console.log(`www/index.html written (GoalTerra ${v}, ${(html.length / 1024).toFixed(0)} KB)`);
