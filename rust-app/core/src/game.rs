//! Game mode, ported from `src/js/30-game-rpg.js`. Everything is derived from history.
//! The seeded RNG and monster generator must match the JS bit for bit, or existing bosses change.
use crate::dates::*;
use crate::logic::*;
use crate::model::*;
use chrono::{Datelike, NaiveDate};
use std::collections::{BTreeMap, HashMap};

/* ---------- seeded RNG (FNV-1a + mulberry32) ---------- */
pub fn hash32(s: &str) -> u32 {
    let mut h: u32 = 2166136261;
    for u in s.encode_utf16() {
        h ^= u as u32;
        h = h.wrapping_mul(16777619);
    }
    h
}

pub struct Rng(u32);
impl Rng {
    pub fn new(seed: u32) -> Self {
        Rng(seed)
    }
    pub fn next(&mut self) -> f64 {
        self.0 = self.0.wrapping_add(0x6d2b79f5);
        let a = self.0;
        let mut t = (a ^ (a >> 15)).wrapping_mul(1 | a);
        t = t.wrapping_add((t ^ (t >> 7)).wrapping_mul(61 | t)) ^ t;
        ((t ^ (t >> 14)) as f64) / 4294967296.0
    }
}

/* ---------- monsters ---------- */
const MON_A: [&str; 18] = [
    "Grum", "Zor", "Blo", "Kra", "Mog", "Vex", "Sno", "Dra", "Plu", "Thra", "Gli", "Bor", "Qua",
    "Fen", "Ska", "Nub", "Wro", "Yag",
];
const MON_B: [&str; 10] = ["va", "mo", "li", "ru", "ka", "zi", "do", "", "", "go"];
const MON_C: [&str; 12] = [
    "k", "x", "th", "gor", "b", "ss", "nar", "rok", "m", "z", "dle", "mp",
];
const MON_T: [&str; 16] = [
    "the Procrastinator",
    "the Snoozer",
    "of Endless Tabs",
    "the Deadline Eater",
    "the Doomscroller",
    "of Unread Messages",
    "the Excuse Maker",
    "the Distractor",
    "of Tomorrow",
    "the Couch Golem",
    "the Notification Fiend",
    "of Half-Done Drafts",
    "the Overthinker",
    "the Time Thief",
    "the Lazy Tide",
    "of Later",
];

#[derive(Debug, Clone, PartialEq)]
pub struct Monster {
    pub name: String,
    pub title: String,
    /// 16x16 cells: 0 empty, 1 body, 2 shade, 3 highlight, 4 outline, 5 white, 6 dark
    pub grid: [[u8; 16]; 16],
    pub hue: u32,
}

impl Monster {
    /// Colour for a cell value as (h, s, l) percent, or fixed RGB for 5 and 6.
    pub fn color(&self, v: u8) -> Option<String> {
        let h = self.hue;
        Some(match v {
            1 => format!("hsl({h} 58% 50%)"),
            2 => format!("hsl({h} 58% 36%)"),
            3 => format!("hsl({h} 70% 68%)"),
            4 => format!("hsl({h} 45% 13%)"),
            5 => "#ffffff".into(),
            6 => "#15110e".into(),
            _ => return None,
        })
    }

    /// Same SVG string the web app builds (used for parity tests and the share image).
    pub fn svg(&self) -> String {
        let mut rects = String::new();
        for y in 0..16 {
            let mut x = 0;
            while x < 16 {
                let v = self.grid[y][x];
                let mut e = x;
                while e < 16 && self.grid[y][e] == v {
                    e += 1;
                }
                if v != 0 {
                    rects += &format!(
                        r#"<rect x="{x}" y="{y}" width="{}" height="1" fill="{}"/>"#,
                        e - x,
                        self.color(v).unwrap()
                    );
                }
                x = e;
            }
        }
        format!(
            r#"<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">{rects}</svg>"#
        )
    }
}

pub fn monster(key: &str) -> Monster {
    let mut r = Rng::new(hash32(&format!("gt-mon:{key}")));
    let mut g = [[0u8; 16]; 16];
    fn put(g: &mut [[u8; 16]; 16], y: usize, x: usize, v: u8) {
        g[y][x] = v;
        g[y][15 - x] = v;
    }
    for y in 1..=14usize {
        for x in 1..=7usize {
            let cx = (x as f64 - 1.0) / 6.0;
            let cy = 1.0 - ((y as f64 - 7.5).abs()) / 6.5;
            if r.next() < 0.55 * cx + 0.5 * cy - 0.12 {
                put(&mut g, y, x, 1);
            }
        }
    }
    for y in 3..=12usize {
        put(&mut g, y, 7, 1);
    }
    for y in 1..=14usize {
        for x in 1..=7usize {
            if g[y][x] != 0
                && g[y - 1][x] == 0
                && g[y + 1][x] == 0
                && g[y][x - 1] == 0
                && g[y][x + 1] == 0
            {
                put(&mut g, y, x, 0);
            }
        }
    }
    let ey = 4 + (r.next() * 3.0).floor() as usize;
    let ex = 5 + (r.next() * 2.0).floor() as usize;
    for y in (ey - 1)..=(ey + 2) {
        for x in (ex - 1)..=7.min(ex + 1) {
            if g[y][x] == 0 {
                put(&mut g, y, x, 1);
            }
        }
    }
    for y in 1..=14usize {
        for x in 1..=7usize {
            if g[y][x] == 1 {
                if g[y - 1][x] == 0 && r.next() < 0.7 {
                    put(&mut g, y, x, 3);
                } else if y > 9 && r.next() < 0.5 {
                    put(&mut g, y, x, 2);
                }
            }
        }
    }
    put(&mut g, ey, ex, 5);
    put(&mut g, ey + 1, ex, 6);
    let my = ey + 3;
    if my <= 13 {
        let k = 1 + (r.next() * 2.0).floor() as usize;
        for x in (8 - k)..=7usize {
            if g[my][x] == 0 {
                continue;
            }
            put(&mut g, my, x, 6);
        }
        if r.next() < 0.5 && g[my + 1][7 - k + 1] != 0 {
            put(&mut g, my + 1, 8 - k, 5);
        }
    }
    let mut o = g;
    for y in 0..16usize {
        for x in 0..16usize {
            if g[y][x] != 0 {
                continue;
            }
            let nb = |dy: i32, dx: i32| {
                let (yy, xx) = (y as i32 + dy, x as i32 + dx);
                yy >= 0 && yy < 16 && xx >= 0 && xx < 16 && g[yy as usize][xx as usize] != 0
            };
            if nb(0, 1) || nb(0, -1) || nb(1, 0) || nb(-1, 0) {
                o[y][x] = 4;
            }
        }
    }
    let hue = (r.next() * 360.0).floor() as u32;
    let mut n = Rng::new(hash32(&format!("gt-name:{key}")));
    let mut pick = |a: &[&str]| a[(n.next() * a.len() as f64).floor() as usize].to_string();
    let name = pick(&MON_A) + &pick(&MON_B) + &pick(&MON_C);
    let title = pick(&MON_T);
    Monster {
        name,
        title,
        grid: o,
        hue,
    }
}

/* ---------- damage ---------- */
pub fn hero_level(xp: i64) -> i64 {
    ((xp as f64 / 50.0).sqrt()).floor() as i64 + 1
}

fn pri_dmg(p: &str) -> f64 {
    match p {
        "low" => 10.0,
        "med" => 20.0,
        "high" => 30.0,
        _ => 10.0,
    }
}
const SESSION_XP: [i64; 4] = [0, 5, 8, 12];
fn session_xp(c: u32) -> i64 {
    SESSION_XP.get(c as usize).copied().unwrap_or(0)
}

pub fn lvl_at(cfg: &Cfg) -> [i64; 3] {
    let l2 = if cfg.lvl2.is_finite() && cfg.lvl2 != 0.0 {
        cfg.lvl2
    } else {
        3.0
    };
    let l3 = if cfg.lvl3.is_finite() && cfg.lvl3 != 0.0 {
        cfg.lvl3
    } else {
        5.0
    };
    [0, l2.max(1.0) as i64, l3.max(2.0) as i64]
}
pub fn tier_of(cfg: &Cfg, n: i64) -> u8 {
    let l = lvl_at(cfg);
    if n >= l[2] {
        2
    } else if n >= l[1] {
        1
    } else {
        0
    }
}

pub struct Game<'a> {
    pub s: &'a State,
    pub today: NaiveDate,
    /// UTC offset (seconds) at a UTC ms timestamp, for turning timestamps into local dates.
    pub off: Offset<'a>,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Dmg {
    pub v: i64,
    pub crit: bool,
}

fn js_round(x: f64) -> i64 {
    (x + 0.5).floor() as i64
}

pub fn monday_of(d: NaiveDate) -> NaiveDate {
    add_days(d, -(((js_dow(d) + 6) % 7) as i64))
}

impl Game<'_> {
    pub fn local_date(&self, ms: i64) -> NaiveDate {
        crate::dates::local_date(ms, self.off).unwrap_or(self.today)
    }
    fn k(&self, ms: i64) -> String {
        ds(self.local_date(ms))
    }
    fn ctx(&self) -> Ctx<'_> {
        Ctx {
            s: self.s,
            today: self.today,
            off: self.off,
        }
    }

    fn base(&self, t: &Task) -> f64 {
        let mut v = pri_dmg(&t.priority);
        if let Some(gid) = &t.goal_id {
            if self
                .s
                .goals
                .iter()
                .any(|g| &g.id == gid && g.horizon == "weekly")
            {
                v *= 1.5;
            }
        }
        v
    }

    /// Damage for one finished task. `nth` = its position among tasks finished that day.
    pub fn task_dmg(&self, t: &Task, at: i64, nth: i64) -> Dmg {
        let mut v = self.base(t);
        let k = self.k(at);
        if let Some(due) = &t.due {
            if !due.is_empty() {
                if k < *due {
                    v *= 1.2
                } else if k > *due {
                    v *= 0.5
                }
            }
        }
        let p = t.pushes.len();
        if p > 0 {
            v *= (1.0 - 0.1 * p as f64).max(0.5);
        }
        if t.created != 0 && at - t.created < 5 * 60_000 {
            v *= 0.5;
        }
        let tr = tier_of(&self.s.cfg, nth);
        let mut crit = false;
        if tr == 1 {
            v *= 1.1
        } else if tr == 2 {
            v *= 1.25;
            crit = true;
        }
        if nth > 12 {
            v *= 0.5;
        }
        Dmg {
            v: js_round(v).max(1),
            crit,
        }
    }

    pub fn elite_of(&self, e: &Exam) -> Elite {
        let end = e.date.clone();
        let start = parse(&e.date)
            .map(|d| ds(add_days(d, -21)))
            .unwrap_or_default();
        let hp = if e.kind == "quiz" { 30 } else { 60 };
        let mut prep = 0;
        for t in self.s.topics.iter().filter(|t| t.subject == e.subject) {
            for se in &t.sessions {
                if se.d >= start && se.d <= end {
                    prep += session_xp(se.c);
                }
            }
        }
        let today = ds(self.today);
        let pct = e.score.map(|sc| match e.max {
            Some(m) if m > 0.0 => js_round(sc / m * 100.0),
            _ => js_round(sc),
        });
        let target = if self.s.cfg.elite_target.is_finite() && self.s.cfg.elite_target != 0.0 {
            self.s.cfg.elite_target
        } else {
            60.0
        };
        let state = match pct {
            Some(p) => {
                if p as f64 >= target {
                    EliteState::Won
                } else {
                    EliteState::Lost
                }
            }
            None => {
                if e.date < today {
                    EliteState::Await
                } else {
                    EliteState::Prep
                }
            }
        };
        let bonus = if state == EliteState::Won {
            if e.kind == "quiz" {
                25
            } else {
                50
            }
        } else {
            0
        };
        Elite {
            exam_id: e.id.clone(),
            hp,
            prep,
            pct,
            state,
            bonus,
        }
    }

    pub fn elites(&self) -> Vec<Elite> {
        if !self.s.cfg.student {
            return vec![];
        }
        self.s.exams.iter().map(|e| self.elite_of(e)).collect()
    }

    pub fn all(&self) -> Rpg {
        let s = self.s;
        let today = ds(self.today);
        let stu = s.cfg.student;
        let ctx = self.ctx();
        let mut by_day: BTreeMap<String, Vec<&Task>> = BTreeMap::new();
        for t in &s.tasks {
            if t.done {
                if let Some(at) = t.done_at.filter(|a| *a != 0) {
                    by_day.entry(self.k(at)).or_default().push(t);
                }
            }
        }
        let mut tdmg: HashMap<&str, Dmg> = HashMap::new();
        for ts in by_day.values_mut() {
            ts.sort_by_key(|t| t.done_at);
            for (i, t) in ts.iter().enumerate() {
                let d = match t.dmg {
                    Some(v) => Dmg {
                        v: js_round(v),
                        crit: t.crit,
                    },
                    None => self.task_dmg(t, t.done_at.unwrap(), i as i64 + 1),
                };
                tdmg.insert(t.id.as_str(), d);
            }
        }
        let (mut f_day, mut i_day, mut s_day, mut h_day) = (
            HashMap::<String, i64>::new(),
            HashMap::<String, i64>::new(),
            HashMap::<String, i64>::new(),
            HashMap::<String, i64>::new(),
        );
        let mut plan: HashMap<String, f64> = HashMap::new();
        for t in &s.tasks {
            for f in &t.focus_log {
                *f_day.entry(self.k(f.at)).or_default() += 2 * (f.m / 5.0).floor() as i64;
            }
            for it in &t.items {
                if let (Some(d), Some(at)) =
                    (it.dmg.filter(|d| *d != 0.0), it.at.filter(|a| *a != 0))
                {
                    *i_day.entry(self.k(at)).or_default() += d as i64;
                }
            }
            if let Some(due) = t.due.as_deref().and_then(parse) {
                *plan.entry(iso_week(due)).or_default() += self.base(t);
            }
        }
        if stu {
            for tp in &s.topics {
                for se in &tp.sessions {
                    *s_day.entry(se.d.clone()).or_default() += session_xp(se.c);
                }
            }
        }
        let mut start = today.clone();
        let mut lo = |k: &str| {
            if !k.is_empty() && k < start.as_str() {
                start = k.to_string();
            }
        };
        for t in &s.tasks {
            if t.created != 0 {
                lo(&self.k(t.created));
            }
            if let Some(a) = t.done_at.filter(|a| *a != 0) {
                lo(&self.k(a));
            }
        }
        for id in &s.logs {
            lo(id.rsplit('|').next().unwrap_or(""));
        }
        if stu {
            for k in s_day.keys() {
                lo(k);
            }
        }
        let cur_mon = monday_of(self.today);
        let mut mon = monday_of(parse(&start).unwrap_or(self.today));
        let min = add_days(cur_mon, -7 * 103);
        if mon < min {
            mon = min;
        }

        let build: Vec<&Habit> = s.habits.iter().filter(|h| !is_neg(h)).collect();
        let from = add_days(mon, -40);
        let mon_k = ds(mon);
        for h in &build {
            let mut gi: Vec<i64> = vec![];
            let (mut p, mut brk, mut i) = (0usize, -1_000_000_000i64, 0i64);
            let mut d = from;
            while ds(d) <= today {
                let k = ds(d);
                if s.logs.contains(&format!("{}|{}", h.id, k)) {
                    gi.push(i);
                    let lim = brk.max(i - 35);
                    while p < gi.len() && gi[p] <= lim {
                        p += 1;
                    }
                    if k >= mon_k {
                        *h_day.entry(k).or_default() += 5 + 5.min(((gi.len() - p) / 7) as i64);
                    }
                } else if is_due(h, d) {
                    brk = i;
                }
                d = add_days(d, 1);
                i += 1;
            }
        }

        let mut weeks: Vec<Week> = vec![];
        let mut hist: Vec<i64> = vec![];
        let mut day_d: HashMap<String, i64> = HashMap::new();
        let (mut xp, mut tot_t, mut tot_h, mut tot_s) = (0i64, 0i64, 0i64, 0i64);
        let mut m = mon;
        while m <= cur_mon {
            let keys: Vec<String> = (0..7).map(|i| ds(add_days(m, i))).collect();
            let wk = iso_week(m);
            let (mut t_d, mut h_d, mut s_d, mut f_d, mut best) = (0i64, 0i64, 0i64, 0i64, 0i64);
            let mut planned = plan.get(&wk).copied().unwrap_or(0.0);
            for k in &keys {
                let mut dd = 0i64;
                for t in by_day.get(k).into_iter().flatten() {
                    let d = tdmg[t.id.as_str()];
                    t_d += d.v;
                    dd += d.v;
                    if d.v > best {
                        best = d.v;
                    }
                }
                if let Some(&v) = i_day.get(k) {
                    if v != 0 {
                        t_d += v;
                        dd += v;
                    }
                }
                if let Some(&v) = f_day.get(k) {
                    if v != 0 {
                        f_d += v;
                        dd += v;
                    }
                }
                if let Some(&v) = h_day.get(k) {
                    if v != 0 {
                        h_d += v;
                        dd += v;
                    }
                }
                if let Some(&v) = s_day.get(k) {
                    if v != 0 {
                        s_d += v;
                        dd += v;
                    }
                }
                if dd != 0 {
                    day_d.insert(k.clone(), dd);
                }
            }
            for h in &build {
                let b = born(h, self.off);
                for k in &keys {
                    if *k >= b && parse(k).map(|d| is_due(h, d)).unwrap_or(false) {
                        planned += 5.0;
                    }
                }
            }
            let total = t_d + h_d + s_d + f_d;
            let prev: Vec<i64> = hist
                .iter()
                .rev()
                .take(4)
                .copied()
                .filter(|x| *x > 0)
                .collect();
            let avg = if prev.is_empty() {
                0.0
            } else {
                prev.iter().sum::<i64>() as f64 / prev.len() as f64
            };
            let hp = 60.max(js_round(planned * 0.8)).max(js_round(avg * 0.9));
            hist.push(total.min(js_round(hp as f64 * 1.25))); // one huge week raises the next boss by at most 25%
            xp += total;
            tot_t += t_d + f_d;
            tot_h += h_d;
            tot_s += s_d;
            weeks.push(Week {
                key: wk,
                keys,
                t_d,
                h_d,
                s_d,
                f_d,
                total,
                hp,
                best,
                won: total >= hp,
                ko: 0,
                over: 0,
            });
            m = add_days(m, 7);
        }
        let negs: Vec<&Habit> = s.habits.iter().filter(|h| is_neg(h)).collect();
        let mut clean = 0i64;
        for h in &negs {
            let mut d = parse(&born(h, self.off)).unwrap_or(self.today);
            let mut i = 0;
            while i < 1500 && ds(d) <= today {
                if ctx.good(h, &ds(d)) {
                    clean += 1;
                }
                d = add_days(d, 1);
                i += 1;
            }
        }
        if stu {
            for x in self.elites() {
                xp += x.bonus;
            }
        }

        // Counterattacks: replay each finished day since game mode was turned on.
        // Once a week's boss is dead it stops attacking for the rest of that week, and a knockout can never undo a win.
        let since = if s.cfg.rpg_since.is_empty() {
            today.clone()
        } else {
            s.cfg.rpg_since.clone()
        };
        let wmap: HashMap<&str, &Week> = weeks.iter().map(|w| (w.key.as_str(), w)).collect();
        #[derive(Default)]
        struct Wk {
            cum: i64,
            ko: i64,
            dead: bool,
        }
        let mut st: HashMap<String, Wk> = HashMap::new();
        let (mut sh, mut mor, mut kos, mut blocked, mut hits) = (0i64, 100i64, 0i64, 0i64, 0i64);
        let mut d = parse(&since).unwrap_or(self.today);
        let mut i = 0;
        while ds(d) < today && i < 800 {
            let k = ds(d);
            let wk = iso_week(d);
            let w = wmap.get(wk.as_str());
            if !st.contains_key(&wk) {
                let mut cum = 0;
                if let Some(w) = w {
                    for kk in &w.keys {
                        if *kk < k {
                            cum += day_d.get(kk).copied().unwrap_or(0);
                        }
                    }
                }
                st.insert(
                    wk.clone(),
                    Wk {
                        cum,
                        ..Default::default()
                    },
                );
            }
            let ws = st.get_mut(&wk).unwrap();
            ws.cum += day_d.get(&k).copied().unwrap_or(0);
            if let Some(w) = w {
                if !ws.dead && ws.cum >= js_round(w.hp as f64 * (1.0 + 0.2 * ws.ko as f64)) {
                    ws.dead = true;
                }
            }
            for h in &negs {
                if k >= born(h, self.off) && ctx.good(h, &k) {
                    sh = (sh + 1).min(3);
                }
            }
            if day_d.get(&k).copied().unwrap_or(0) > 0 {
                mor = (mor + 10).min(100);
            } else if s.rest_days.contains(&k) || ws.dead {
            } else if sh > 0 {
                sh -= 1;
                blocked += 1;
            } else {
                hits += 1;
                mor -= 25;
                if mor <= 0 {
                    kos += 1;
                    ws.ko += 1;
                    mor = 100;
                }
            }
            d = add_days(d, 1);
            i += 1;
        }
        let mut over_xp = 0i64;
        for w in &mut weeks {
            if let Some(ws) = st.get(&w.key) {
                if ws.ko != 0 {
                    w.ko = ws.ko;
                    w.hp = js_round(w.hp as f64 * (1.0 + 0.2 * w.ko as f64));
                }
            }
            w.won = w.total >= w.hp;
            w.over = (w.total - w.hp).max(0);
            // overkill: a small bonus, not a bigger boss
            if w.won {
                over_xp += 40.min(js_round(w.over as f64 * 0.25));
            }
        }
        xp += over_xp;
        // Weeks won in a row (the week in progress never breaks the streak).
        let (mut run, mut best_streak) = (0i64, 0i64);
        let nweeks = weeks.len();
        for (i, w) in weeks.iter().enumerate() {
            run = if w.won {
                run + 1
            } else if i == nweeks - 1 {
                run
            } else {
                0
            };
            best_streak = best_streak.max(run);
        }
        let streak = run;
        let mut shields = sh;
        for h in &negs {
            if today >= born(h, self.off) && ctx.good(h, &today) {
                shields = (shields + 1).min(3);
            }
        }
        let used = s.rest_days.len() as i64;
        let won_weeks = weeks.iter().filter(|w| w.won).count() as i64;
        let tokens = (won_weeks - used).max(0);
        Rpg {
            weeks,
            xp,
            tot_t,
            tot_h,
            tot_s,
            clean,
            day_d,
            shields,
            morale: mor,
            kos,
            blocked,
            hits,
            tokens,
            over_xp,
            streak,
            best_streak,
        }
    }

    /// Monthly guardians and annual bosses.
    pub fn tower(&self, a: &Rpg) -> Tower {
        let s = self.s;
        let today = ds(self.today);
        let cm = today[..7].to_string();
        let cy = today[..4].to_string();
        let mut by_m: BTreeMap<String, Vec<&Week>> = BTreeMap::new();
        for w in &a.weeks {
            by_m.entry(w.keys[3][..7].to_string()).or_default().push(w);
        }
        let mdone = |mk: &str| {
            s.goals
                .iter()
                .filter(|g| g.horizon == "monthly" && g.period == mk && g.done)
                .count() as i64
        };
        let mut months: Vec<TowerMonth> = by_m
            .iter()
            .map(|(mk, ws)| {
                let wins = ws.iter().filter(|w| w.won).count() as i64;
                let gd = mdone(mk);
                let hp = weeks_in_month(mk);
                let dmg = wins + gd;
                TowerMonth {
                    key: mk.clone(),
                    week_keys: ws.iter().map(|w| w.key.clone()).collect(),
                    wins,
                    gd,
                    hp,
                    dmg,
                    won: dmg >= hp,
                    past: *mk < cm,
                }
            })
            .collect();
        if !months.iter().any(|m| m.key == cm) {
            months.push(TowerMonth {
                key: cm.clone(),
                week_keys: vec![],
                wins: 0,
                gd: mdone(&cm),
                hp: weeks_in_month(&cm),
                dmg: mdone(&cm),
                won: false,
                past: false,
            });
        }
        let mut ykeys: Vec<String> = months.iter().map(|m| m.key[..4].to_string()).collect();
        ykeys.sort();
        ykeys.dedup();
        let years: Vec<TowerYear> = ykeys
            .into_iter()
            .map(|y| {
                let gw = months.iter().filter(|m| m.key[..4] == y && m.won).count() as i64;
                let ad = s
                    .goals
                    .iter()
                    .filter(|g| g.horizon == "annual" && g.period == y && g.done)
                    .count() as i64;
                let dmg = gw + ad;
                TowerYear {
                    past: y < cy,
                    key: y,
                    gw,
                    ad,
                    hp: 10,
                    dmg,
                    won: dmg >= 10,
                }
            })
            .collect();
        Tower {
            months,
            years,
            cur_m_key: cm,
            cur_y_key: cy,
        }
    }
}

/// Weeks whose Thursday falls in month `mk` (`YYYY-MM`).
pub fn weeks_in_month(mk: &str) -> i64 {
    let (Ok(y), Ok(mo)) = (mk[..4].parse::<i32>(), mk[5..7].parse::<u32>()) else {
        return 0;
    };
    let Some(first) = NaiveDate::from_ymd_opt(y, mo, 1) else {
        return 0;
    };
    let last = last_of_month(y, mo).unwrap();
    let mut m = monday_of(add_days(first, -6));
    let mut n = 0;
    while m <= last {
        if ds(add_days(m, 3))[..7] == *mk {
            n += 1;
        }
        m = add_days(m, 7);
    }
    n
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EliteState {
    Prep,
    Await,
    Won,
    Lost,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Elite {
    pub exam_id: String,
    pub hp: i64,
    pub prep: i64,
    pub pct: Option<i64>,
    pub state: EliteState,
    pub bonus: i64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Week {
    pub key: String,
    pub keys: Vec<String>,
    pub t_d: i64,
    pub h_d: i64,
    pub s_d: i64,
    pub f_d: i64,
    pub total: i64,
    pub hp: i64,
    pub best: i64,
    pub won: bool,
    pub ko: i64,
    /// Damage beyond the boss HP (0 unless won).
    pub over: i64,
}

#[derive(Debug, Clone)]
pub struct Rpg {
    pub weeks: Vec<Week>,
    pub xp: i64,
    pub tot_t: i64,
    pub tot_h: i64,
    pub tot_s: i64,
    pub clean: i64,
    pub day_d: HashMap<String, i64>,
    pub shields: i64,
    pub morale: i64,
    pub kos: i64,
    pub blocked: i64,
    pub hits: i64,
    pub tokens: i64,
    pub over_xp: i64,
    pub streak: i64,
    pub best_streak: i64,
}
impl Rpg {
    pub fn cur(&self) -> &Week {
        self.weeks.last().unwrap()
    }
}

#[derive(Debug, Clone)]
pub struct TowerMonth {
    pub key: String,
    pub week_keys: Vec<String>,
    pub wins: i64,
    pub gd: i64,
    pub hp: i64,
    pub dmg: i64,
    pub won: bool,
    pub past: bool,
}
#[derive(Debug, Clone)]
pub struct TowerYear {
    pub key: String,
    pub gw: i64,
    pub ad: i64,
    pub hp: i64,
    pub dmg: i64,
    pub won: bool,
    pub past: bool,
}
#[derive(Debug, Clone)]
pub struct Tower {
    pub months: Vec<TowerMonth>,
    pub years: Vec<TowerYear>,
    pub cur_m_key: String,
    pub cur_y_key: String,
}
impl Tower {
    pub fn cur_m(&self) -> &TowerMonth {
        self.months
            .iter()
            .find(|m| m.key == self.cur_m_key)
            .unwrap()
    }
    pub fn cur_y(&self) -> &TowerYear {
        self.years.iter().find(|y| y.key == self.cur_y_key).unwrap()
    }
}

#[allow(dead_code)]
fn _unused(d: NaiveDate) -> i32 {
    d.year()
}
