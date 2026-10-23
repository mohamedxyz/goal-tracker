// Joins src/ into the single-file app. Usage: node build.mjs          (writes goal-tracker.html)
//                                             node build.mjs --check  (exit 1 if goal-tracker.html is stale)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const js = fs.readdirSync(path.join(root, 'src/js')).filter(f => f.endsWith('.js')).sort().map(f => 'src/js/' + f);
const out = ['src/00-head.html', 'src/style.css', 'src/10-body.html', ...js, 'src/99-tail.html'].map(rd).join('');
const target = path.join(root, 'goal-tracker.html');
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  if (cur !== out) { console.error('goal-tracker.html is out of date. Run: node build.mjs'); process.exit(1); }
  console.log('goal-tracker.html is up to date');
} else {
  fs.writeFileSync(target, out);
  console.log('built goal-tracker.html (' + out.length + ' chars from ' + (js.length + 3) + ' files)');
}
