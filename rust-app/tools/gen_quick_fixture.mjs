// Runs the web app's parseQuick (the oracle) on many inputs with the clock frozen at 2026-10-23 10:00 (a Friday).
// Usage: GT_SRC=<path to src/js> node rust-app/tools/gen_quick_fixture.mjs
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = process.env.GT_SRC || path.join(HERE, '..', '..', 'src', 'js');
const load = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');
const quick = load('40-quickadd-focus-timer.js');
const code = quick.slice(quick.indexOf('const QA_WD'), quick.indexOf('function qaHint'));
const core = load('10-core-data-state.js');
const CASES = [
  'Essay tomorrow !high #uni', "Read today's news", 'Call mom fri', 'Gym on monday !m', 'Report in 3 days', 'Plan next week',
  'Exam 25 oct', 'Exam nov 3', 'Pay bill 2/11', 'Read 1/2 of book', 'Make money moves', 'SAT prep', 'مراجعة الفصل باچر !عالي #جامعة',
  'واجب بعد غد', 'امتحان الخميس', 'تقرير بعد 3 أيام', 'اجتماع اليوم', 'tomorrow', 'Old 2026-02-30', 'Thursday thing 2026-12-01',
  'Gym at 6pm for 1h tomorrow', 'Call 18:30 for 45 min', 'Report in 3 days', 'Read for 2 hours', 'اجتماع الساعة 6م لمدة ساعة',
  'Lunch 12pm', 'Lunch 12am', 'Meet 7:15 am for 90 minutes', 'Call at 25:00', 'Run 6:99pm', 'Study for an hour 9:00',
  'Do it 9:00 for 3 min', 'Do it 9:00 for 800 min', 'Pay 29 feb', 'Party 29 Feb 2027', 'Trip in 2 weeks', 'Trip بعد 2 أسابيع',
  'Mon meeting', 'MON meeting', 'Meet on Wednesday #work !low', '#a #b two tags', '!1 first !3 second', 'Task ! high', 'x #tag-with-dash_1',
  '   spaced    out   tomorrow   ', '', 'tomorrow tomorrow', 'next week tomorrow', 'يوم الجمعة نلتقي', 'الخميس والجمعة', 'Dec 31 party', '31 dec party',
  '0099-05-05 old', 'Fri', 'a fri b sat', 'Due 1/13', 'Due 13/1', 'Due 32/1', 'Report !MEDIUM now', 'Report !m', 'بعد بكرة اجتماع', 'بكرة', 'غدا الساعة 8ص لمدة ساعة ونصف',
];
class FakeDate extends Date {
  constructor(...a) { if (a.length) super(...a); else super(2026, 9, 23, 10, 0, 0); }
  static now() { return new Date(2026, 9, 23, 10, 0, 0).getTime(); }
}
const out = vm.runInNewContext(`${core}\n${code}\nCASES.map(raw => ({ raw, ...parseQuick(raw) }))`, {
  Date: FakeDate, Intl, Math, JSON, Set, Map, console, CASES, localStorage: { getItem: () => null, setItem() {} }, document: {}, window: {}, navigator: {},
});
const file = path.join(HERE, '..', 'core', 'tests', 'fixtures', 'quick.json');
fs.writeFileSync(file, JSON.stringify({ today: '2026-10-23', cases: out }, null, 1));
console.log('wrote', out.length, 'cases');
