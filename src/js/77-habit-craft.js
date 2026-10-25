/**
 * Habits built on the four laws of Atomic Habits: obvious (stacking, time and place), attractive (identity votes,
 * rewards), easy (two-minute version), satisfying (instant payoff, today ring, never miss twice).
 * (All src/js files are joined, in filename order, into one shared scope. See src/README.md.)
 */
const STICK = ['ident', 'after', 'at', 'where', 'treat', 'mini', 'env'];
/* The optional "Make it stick" section of the habit forms. */
function stickFields(h) {
  h = h || {};
  const anchors = S.habits.filter((x) => !isNeg(x) && x.id !== h.id),
    linked = anchors.some((x) => x.id === h.after),
    open = S._stick || STICK.some((k) => h[k]);
  S._stick = false;
  return `<details class="more stick" style="flex:1 1 100%" ${open ? 'open' : ''}><summary>${L2('Make it stick (optional)', 'اجعلها تثبت (اختياري)')}</summary>
    <label>${L2('Identity: I am becoming…', 'الهوية: أنا أصبح…')}</label><input type="text" name="ident" value="${esc(h.ident || '')}" placeholder="${L2('e.g. a reader', 'مثال: قارئًا')}" autocomplete="off">
    <label>${L2('Two-minute version', 'النسخة السريعة (دقيقتان)')}</label><input type="text" name="mini" value="${esc(h.mini || '')}" placeholder="${L2('e.g. read one page', 'مثال: اقرأ صفحة واحدة')}" autocomplete="off">
    <label>${L2('After I…', 'بعد أن…')}</label><select name="after"><option value="">—</option>${anchors.map((x) => `<option value="${x.id}" ${x.id === h.after ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
    <input type="text" name="afterTxt" value="${linked ? '' : esc(h.after || '')}" placeholder="${L2('or something else, e.g. morning coffee', 'أو شيء آخر، مثل قهوة الصباح')}" autocomplete="off">
    <div class="two"><div><label>${L2('At (time)', 'الوقت')}</label><input type="time" name="at" value="${h.at || ''}"></div><div><label>${L2('Where', 'المكان')}</label><input type="text" name="where" value="${esc(h.where || '')}" autocomplete="off"></div></div>
    <label>${L2('Then I get to…', 'ثم أسمح لنفسي بـ…')}</label><input type="text" name="treat" value="${esc(h.treat || '')}" placeholder="${L2('a treat I only allow after this', 'مكافأة لا آخذها إلا بعدها')}" autocomplete="off">
    <label>${L2('Make it easy: what I set up', 'اجعلها سهلة: ما أجهّزه')}</label><input type="text" name="env" value="${esc(h.env || '')}" placeholder="${L2('e.g. book on my pillow', 'مثال: الكتاب على وسادتي')}" autocomplete="off"></details>`;
}
function stickRead(v) {
  const o = {};
  for (const k of ['ident', 'where', 'treat', 'mini', 'env']) o[k] = (v[k] || '').trim();
  o.at = v.at || '';
  o.after = v.after || (v.afterTxt || '').trim();
  return o;
}
function stackOrder(list) {
  const ids = new Set(list.map((h) => h.id)),
    kids = new Map(),
    roots = [];
  for (const h of list) {
    if (h.after && ids.has(h.after) && h.after !== h.id) {
      if (!kids.has(h.after)) kids.set(h.after, []);
      kids.get(h.after).push(h);
    } else roots.push(h);
  }
  const out = [],
    seen = new Set(),
    add = (h) => {
      if (seen.has(h.id)) return;
      seen.add(h.id);
      out.push(h);
      (kids.get(h.id) || []).forEach(add);
    };
  roots.forEach(add);
  list.forEach(add);
  return out;
}
/* Lines under a habit's name: identity votes, when and where, the stack anchor, the treat, the miss message, the 2-minute button. */
function habitHint(h) {
  if (isNeg(h)) return '';
  const T = TODAY(),
    yd = addDays(new Date(), -1),
    yk = ds(yd),
    bits = [];
  if (h.ident)
    bits.push(
      `🗳 ${habitDates(h).length} ${L2('votes for being', 'صوتًا لتصبح')} <span translate="no">${esc(h.ident)}</span>`
    );
  if (h.at || h.where)
    bits.push(
      `⏰ ${h.at ? esc(h.at) : ''}${h.where ? (h.at ? ' · ' : '') + L2('in ', 'في ') + `<span translate="no">${esc(h.where)}</span>` : ''}`
    );
  if (h.after) {
    const a = S.habits.find((x) => x.id === h.after);
    bits.push(`↳ ${L2('After', 'بعد')} <span translate="no">${esc(a ? a.name : h.after)}</span>`);
  }
  if (h.treat) bits.push(`🎁 <span translate="no">${esc(h.treat)}</span>`);
  const missed =
    dueToday(h) && isDue(h, yd) && !isRest(yk) && yk >= bornK(h) && !good(h, yk) && !good(h, T) && streak(h) > 0;
  let out = bits.length ? `<div class="meta hint">${bits.map((b) => `<span>${b}</span>`).join('')}</div>` : '';
  if (missed)
    out += `<div class="meta hint miss">${L2('Missed yesterday. Today is the one that counts.', 'فاتك أمس. اليوم هو الذي يهم.')}</div>`;
  if (h.mini && dueToday(h) && !good(h, T))
    out += `<div class="hint"><button type="button" class="chip" data-action="log-mini" data-id="${h.id}" data-date="${T}">½ <span translate="no">${esc(h.mini)}</span></button></div>`;
  return out;
}
/* Perfect days in the last 60: every habit that was due (and already created) was done. */
let _pd = [0, ''];
function perfectDays() {
  const key = DBV + '|' + TODAY() + '|' + S.logs.size + '|' + S.habits.length;
  if (_pd[1] === key) return _pd[0];
  let n = 0;
  for (let i = 0; i < 60; i++) {
    const d = addDays(new Date(), -i),
      k = ds(d),
      hs = S.habits.filter((h) => !isNeg(h) && isDue(h, d) && k >= bornK(h));
    if (hs.length && hs.every((h) => good(h, k))) n++;
  }
  _pd = [n, key];
  return n;
}
function habitRing() {
  const due = S.habits.filter((h) => !isNeg(h) && dueToday(h));
  if (!due.length || S.cfg.habitFx === false) return '';
  const done = due.filter((h) => good(h, TODAY())).length,
    C = 2 * Math.PI * 18,
    full = done === due.length,
    pd = perfectDays();
  return `<div class="hring ${full ? 'full' : ''}"><svg viewBox="0 0 44 44" width="52" height="52" aria-hidden="true"><circle cx="22" cy="22" r="18" class="bg"/><circle cx="22" cy="22" r="18" class="fg" stroke-dasharray="${((done / due.length) * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 22 22)"/></svg>
    <div><div class="title">${full ? L2('Perfect day 🎉', 'يوم مثالي 🎉') : L2(`${done} of ${due.length} habits today`, `${done} من ${due.length} عادات اليوم`)}</div>
    <div class="meta">${pd ? L2(`${pd} perfect day(s) in the last 60`, `${pd} يوم مثالي في آخر 60`) : L2('Close the ring for a perfect day.', 'أغلق الحلقة لتحصل على يوم مثالي.')}</div></div></div>`;
}
/* The hardest habit, with an offer to shrink it to a two-minute version. */
function easierCard() {
  const old = Date.now() - 14 * 864e5,
    h = S.habits
      .filter((x) => !isNeg(x) && !x.mini && (x.created || 0) < old && rate30(x) < 60)
      .sort((a, b) => rate30(a) - rate30(b))[0];
  if (!h) return '';
  return `<div class="card backup-cta"><div class="grow"><div class="title">${L2('Hardest one: ', 'الأصعب: ')}<span translate="no">${esc(h.name)}</span> (${rate30(h)}%)</div><div class="meta">${L2('Make it so small you cannot say no, like one page or one push-up. Showing up matters more than the size.', 'اجعلها صغيرة لدرجة لا تستطيع رفضها، كصفحة واحدة أو تمرين واحد. الحضور أهم من الحجم.')}</div></div><button class="btn" data-action="easier" data-id="${h.id}">${L2('Add a 2-minute version', 'أضف نسخة دقيقتين')}</button></div>`;
}
